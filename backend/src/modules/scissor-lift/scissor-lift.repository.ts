import type { PoolClient } from "pg";
import { log } from "../../shared/logger.js";
import { validateLiftMovement } from "./scissor-lift.rules.js";
import type { LiftDirection } from "./scissor-lift.types.js";
import { pool } from "../../db/pool.js";
import type { ScissorLiftState } from "./scissor-lift.types.js";
import { HttpError } from "../../shared/errors.js";

interface LiftRow {
  id: string;
  position: ScissorLiftState["position"];
  status: ScissorLiftState["status"];
  emergency_stopped: boolean;
  last_heartbeat: Date | null;
  updated_at: Date;
}

function mapRow(row: LiftRow): ScissorLiftState {
  return {
    id: row.id,
    position: row.position,
    status: row.status,
    emergencyStopped: row.emergency_stopped,
    lastHeartbeat: row.last_heartbeat?.toISOString() ?? null,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getLiftState(): Promise<ScissorLiftState> {
  const result = await pool.query<LiftRow>(
    "SELECT * FROM scissor_lift_state WHERE id = $1",
    ["lift-1"],
  );

  if (!result.rows[0]) {
    throw new Error("Scissor Lift state not found");
  }

  return mapRow(result.rows[0]);
}

export async function updateLiftState(
  changes: Partial<
    Pick<ScissorLiftState, "position" | "status" | "emergencyStopped">
  >,
): Promise<ScissorLiftState> {
  const current = await getLiftState();

  const result = await pool.query<LiftRow>(
    `
      UPDATE scissor_lift_state
      SET position = $1,
          status = $2,
          emergency_stopped = $3,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `,
    [
      changes.position ?? current.position,
      changes.status ?? current.status,
      changes.emergencyStopped ?? current.emergencyStopped,
      "lift-1",
    ],
  );

  if (!result.rows[0]) {
    throw new Error("Failed to update Scissor Lift state");
  }

  return mapRow(result.rows[0]);
}


export async function updateLiftHeartbeat(): Promise<ScissorLiftState> {
  const result = await pool.query<LiftRow>(
    `
      UPDATE scissor_lift_state
      SET last_heartbeat = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    ["lift-1"],
  );

  if (!result.rows[0]) {
    throw new Error("Scissor Lift state not found");
  }

  return mapRow(result.rows[0]);
}


export async function markLiftHeartbeatMissed(): Promise<boolean> {
  const result = await pool.query(
    `
      UPDATE scissor_lift_state
      SET heartbeat_alert_active = TRUE,
          updated_at = NOW()
      WHERE id = $1
        AND heartbeat_alert_active = FALSE
        AND (
          last_heartbeat IS NULL
          OR last_heartbeat < NOW() - INTERVAL '30 seconds'
        )
      RETURNING id
    `,
    ["lift-1"],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function clearLiftHeartbeatAlert(): Promise<boolean> {
  const result = await pool.query(
    `
      UPDATE scissor_lift_state
      SET heartbeat_alert_active = FALSE,
          updated_at = NOW()
      WHERE id = $1
        AND heartbeat_alert_active = TRUE
      RETURNING id
    `,
    ["lift-1"],
  );

  return (result.rowCount ?? 0) > 0;
}



export async function moveLiftTransaction(
  direction: LiftDirection,
  actor: string,
): Promise<ScissorLiftState> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the lift row until this transaction finishes.
    const result = await client.query<LiftRow>(
      `
        SELECT *
        FROM scissor_lift_state
        WHERE id = $1
        FOR UPDATE
      `,
      ["lift-1"],
    );

    if (!result.rows[0]) {
      throw new Error("Scissor Lift state not found");
    }

    const current = mapRow(result.rows[0]);

    // Validate using the locked, current state.
    validateLiftMovement(current, direction);

    const targetPosition =
      direction === "up" ? "upper" : "lower";

    const updatedResult = await client.query<LiftRow>(
      `
        UPDATE scissor_lift_state
        SET position = $1,
            status = 'idle',
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [targetPosition, "lift-1"],
    );

    if (!updatedResult.rows[0]) {
      throw new Error("Failed to update Scissor Lift state");
    }

    const updated = mapRow(updatedResult.rows[0]);

    await log(
      {
        level: "info",
        category: "device",
        source: "scissor-lift",
        actor,
        message: `Simulated lift moved ${direction}`,
        details: {
          previousPosition: current.position,
          newPosition: updated.position,
          simulation: true,
        },
      },
      client,
    );

    await client.query("COMMIT");

    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}



export async function stopLiftTransaction(
  actor: string,
): Promise<ScissorLiftState> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<LiftRow>(
      `UPDATE scissor_lift_state
       SET status = 'stopped',
           emergency_stopped = TRUE,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      ["lift-1"],
    );

    if (!result.rows[0]) {
      throw new Error("Scissor Lift state not found");
    }

    const updated = mapRow(result.rows[0]);

    await log(
      {
        level: "warn",
        category: "device",
        source: "scissor-lift",
        actor,
        message: "Simulated lift emergency stop activated",
        details: {
          position: updated.position,
          simulation: true,
        },
      },
      client,
    );

    await client.query("COMMIT");
    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function resumeLiftTransaction(
  actor: string,
): Promise<ScissorLiftState> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<LiftRow>(
      `UPDATE scissor_lift_state
       SET status = 'idle',
           emergency_stopped = FALSE,
           updated_at = NOW()
       WHERE id = $1
         AND emergency_stopped = TRUE
       RETURNING *`,
      ["lift-1"],
    );

    if (!result.rows[0]) {
      const exists = await client.query(
        "SELECT id FROM scissor_lift_state WHERE id = $1",
        ["lift-1"],
      );

      if (!exists.rows[0]) {
        throw new Error("Scissor Lift state not found");
      }

      throw new HttpError(409, "Lift is not emergency stopped");
    }

    const updated = mapRow(result.rows[0]);

    await log(
      {
        level: "info",
        category: "device",
        source: "scissor-lift",
        actor,
        message: "Simulated lift resumed",
        details: {
          position: updated.position,
          simulation: true,
        },
      },
      client,
    );

    await client.query("COMMIT");
    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


export async function receiveLiftHeartbeatTransaction(): Promise<ScissorLiftState> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const previous = await client.query<
      LiftRow & { heartbeat_alert_active: boolean }
    >(
      `
        SELECT *
        FROM scissor_lift_state
        WHERE id = $1
        FOR UPDATE
      `,
      ["lift-1"],
    );

    const previousRow = previous.rows[0];

    if (!previousRow) {
      throw new Error("Scissor Lift state not found");
    }

    const wasAlertActive = previousRow.heartbeat_alert_active;

    const result = await client.query<LiftRow>(
      `
        UPDATE scissor_lift_state
        SET last_heartbeat = NOW(),
            heartbeat_alert_active = FALSE,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      ["lift-1"],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to update Scissor Lift heartbeat");
    }

    const state = mapRow(row);

    if (wasAlertActive) {
      await log(
        {
          level: "info",
          category: "device",
          source: "scissor-lift",
          actor: "system",
          message: "Scissor Lift heartbeat restored",
          details: {
            lastHeartbeat: state.lastHeartbeat,
            simulation: true,
          },
        },
        client,
      );
    }

    await client.query("COMMIT");
    return state;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


export async function checkLiftHeartbeatTransaction(): Promise<{
  online: boolean;
  lastHeartbeat: string | null;
}> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<LiftRow>(
      `
        SELECT *
        FROM scissor_lift_state
        WHERE id = $1
        FOR UPDATE
      `,
      ["lift-1"],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Scissor Lift state not found");
    }

    const state = mapRow(row);

    const timeoutMs = 30_000;
    const online =
      state.lastHeartbeat !== null &&
      Date.now() - new Date(state.lastHeartbeat).getTime() <= timeoutMs;

    if (!online) {
      const updated = await client.query(
        `
          UPDATE scissor_lift_state
          SET heartbeat_alert_active = TRUE,
              updated_at = NOW()
          WHERE id = $1
            AND heartbeat_alert_active = FALSE
          RETURNING id
        `,
        ["lift-1"],
      );

      if ((updated.rowCount ?? 0) > 0) {
        await log(
          {
            level: "warn",
            category: "device",
            source: "scissor-lift",
            actor: "system",
            message: "Scissor Lift heartbeat missed",
            details: {
              lastHeartbeat: state.lastHeartbeat,
              timeoutMs,
              simulation: true,
            },
          },
          client,
        );
      }
    }

    await client.query("COMMIT");

    return {
      online,
      lastHeartbeat: state.lastHeartbeat,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
