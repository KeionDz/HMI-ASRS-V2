import { HttpError } from "../../shared/errors.js";
import { log } from "../../shared/logger.js";
import { pool } from "../../db/pool.js";
import type { AgvState, AgvStatus } from "./agv.types.js";
import type { PoolClient } from "pg";

interface AgvRow {
  id: string;
  status: AgvStatus;
  battery_level: number;
  current_pallet_id: string | null;
  destination: string | null;
  last_heartbeat: Date | null;
  heartbeat_alert_active: boolean;
  reserved_process_run_id: number | null;
  updated_at: Date;
}

function mapAgvRow(row: AgvRow): AgvState {
  return {
    id: row.id,
    status: row.status,
    batteryLevel: row.battery_level,
    currentPalletId: row.current_pallet_id,
    destination: row.destination,
    lastHeartbeat: row.last_heartbeat?.toISOString() ?? null,
    heartbeatAlertActive: row.heartbeat_alert_active,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function findAllAgvs(): Promise<AgvState[]> {
  const result = await pool.query<AgvRow>(
    `SELECT *
     FROM agv_state
     ORDER BY id ASC`,
  );

  return result.rows.map(mapAgvRow);
}

export async function findAgvById(
  id: string,
): Promise<AgvState | null> {
  const result = await pool.query<AgvRow>(
    `SELECT *
     FROM agv_state
     WHERE id = $1`,
    [id],
  );

  const row = result.rows[0];

  return row ? mapAgvRow(row) : null;
}


export interface AgvDispatchInput {
  palletId: string;
  actor: string;
  agvId?: string;
}

export async function dispatchAgvTransaction(
  input: AgvDispatchInput,
  transactionClient?: PoolClient,
): Promise<AgvState> {
  const client = transactionClient ?? await pool.connect();
  const ownsTransaction = transactionClient === undefined;

  try {
    if (ownsTransaction) {
      await client.query("BEGIN");
    }

    // Lock the pallet first to prevent duplicate assignments.
    const palletResult = await client.query<{
      id: string;
      status: string;
      event_id: string | null;
      is_locked: boolean;
    }>(
      `SELECT id, status, event_id, is_locked
       FROM pallets
       WHERE id = $1
       FOR UPDATE`,
      [input.palletId],
    );

    const pallet = palletResult.rows[0];

    if (!pallet) {
      throw new HttpError(404, "Pallet not found");
    }

    if (pallet.is_locked) {
      throw new HttpError(409, "Pallet is locked");
    }

    if (pallet.status !== "available") {
      throw new HttpError(409, "Pallet is not available");
    }

    if (pallet.event_id !== null) {
      throw new HttpError(
        409,
        "Pallet already has an event assignment",
      );
    }
    
const existingAssignment = await client.query<{
  id: string;
}>(
  `SELECT id
   FROM agv_state
   WHERE current_pallet_id = $1`,
  [pallet.id],
);

if (existingAssignment.rows.length > 0) {
  throw new HttpError(
    409,
    `Pallet is already assigned to ${existingAssignment.rows[0]!.id}`,
  );
}


    // Lock the selected robot. For auto dispatch,
    // choose an available robot with sufficient battery.
    const agvResult = await client.query<AgvRow>(
      input.agvId
        ? `SELECT *
           FROM agv_state
           WHERE id = $1
           FOR UPDATE`
        : `SELECT *
           FROM agv_state
           WHERE status = 'idle'
             AND current_pallet_id IS NULL
             AND reserved_process_run_id IS NULL
             AND battery_level >= 20
             AND heartbeat_alert_active = false
             AND last_heartbeat IS NOT NULL
             AND last_heartbeat >=
                 CURRENT_TIMESTAMP - INTERVAL '60 seconds'
           ORDER BY battery_level DESC, id ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED`,
      input.agvId ? [input.agvId] : [],
    );

    const agv = agvResult.rows[0];

    if (!agv) {
      throw new HttpError(
        input.agvId ? 404 : 409,
        input.agvId
          ? "AGV not found"
          : "No available AGV",
      );
    }

    if (agv.reserved_process_run_id !== null) {
      throw new HttpError(
        409,
        "AGV is reserved by an active process run",
      );
    }

    if (
      agv.status !== "idle" ||
      agv.current_pallet_id !== null
    ) {
      throw new HttpError(409, "AGV is not available");
    }

    if (agv.battery_level < 20) {
      throw new HttpError(409, "AGV battery is too low");
    }

    if (agv.heartbeat_alert_active) {
      throw new HttpError(409, "AGV heartbeat alert is active");
    }

    const heartbeat = await client.query<{ fresh: boolean }>(
      `SELECT (
         last_heartbeat IS NOT NULL
         AND last_heartbeat >=
           CURRENT_TIMESTAMP - INTERVAL '60 seconds'
       ) AS fresh
       FROM agv_state
       WHERE id = $1`,
      [agv.id],
    );

    if (heartbeat.rows[0]?.fresh !== true) {
      throw new HttpError(
        409,
        "AGV heartbeat is missing or stale",
      );
    }

    const updated = await client.query<AgvRow>(
      `UPDATE agv_state
       SET status = 'in_progress',
           current_pallet_id = $2,
           destination = 'Ballroom',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [agv.id, pallet.id],
    );

    await log(
      {
        level: "info",
        category: "process",
        source: "agv",
        actor: input.actor,
        palletId: pallet.id,
        message: `AGV ${agv.id} dispatched to Ballroom`,
        details: {
          agvId: agv.id,
          mode: input.agvId ? "manual" : "auto",
          destination: "Ballroom",
          simulation: true,
        },
      },
      client,
    );

       if (ownsTransaction) {
      await client.query("COMMIT");
    }

    return mapAgvRow(updated.rows[0]!);
  } catch (error) {
    if (ownsTransaction) {
      await client.query("ROLLBACK");
    }

    throw error;
  } finally {
    if (ownsTransaction) {
      client.release();
    }
  }
}


export async function completeAgvTransaction(
  agvId: string,
  actor: string,
): Promise<AgvState> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<AgvRow>(
      `SELECT *
       FROM agv_state
       WHERE id = $1
       FOR UPDATE`,
      [agvId],
    );

    const agv = result.rows[0];

    if (!agv) {
      throw new HttpError(404, "AGV not found");
    }

    if (
      agv.status !== "in_progress" ||
      agv.current_pallet_id === null
    ) {
      throw new HttpError(
        409,
        "AGV has no active delivery to complete",
      );
    }

    const completedPalletId = agv.current_pallet_id;

    const updated = await client.query<AgvRow>(
      `UPDATE agv_state
       SET status = 'idle',
           current_pallet_id = NULL,
           destination = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [agvId],
    );

    await log(
      {
        level: "info",
        category: "process",
        source: "agv",
        actor,
        message: `AGV ${agvId} completed simulated delivery`,
        details: {
          agvId,
          palletId: completedPalletId,
          destination: "Ballroom",
          simulation: true,
        },
      },
      client,
    );

    await client.query("COMMIT");

    return mapAgvRow(updated.rows[0]!);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


export async function updateAgvBatteryTransaction(
  agvId: string,
  batteryLevel: number,
  actor: string,
): Promise<AgvState> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<AgvRow>(
      `SELECT *
       FROM agv_state
       WHERE id = $1
       FOR UPDATE`,
      [agvId],
    );

    const agv = result.rows[0];

    if (!agv) {
      throw new HttpError(404, "AGV not found");
    }

    if (agv.status === "in_progress") {
      throw new HttpError(
        409,
        "Cannot manually change battery during delivery",
      );
    }

    const updated = await client.query<AgvRow>(
      `UPDATE agv_state
       SET battery_level = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [agvId, batteryLevel],
    );

    await log(
      {
        level: "info",
        category: "device",
        source: "agv",
        actor,
        message: `AGV ${agvId} battery updated to ${batteryLevel}%`,
        details: {
          agvId,
          previousBatteryLevel: agv.battery_level,
          batteryLevel,
          simulation: true,
        },
      },
      client,
    );

    await client.query("COMMIT");

    return mapAgvRow(updated.rows[0]!);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


export async function setAgvChargingTransaction(
  agvId: string,
  charging: boolean,
  actor: string,
): Promise<AgvState> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<AgvRow>(
      `SELECT * FROM agv_state WHERE id = $1 FOR UPDATE`,
      [agvId],
    );

    const agv = result.rows[0];

    if (!agv) {
      throw new HttpError(404, "AGV not found");
    }

    if (agv.status === "in_progress") {
      throw new HttpError(
        409,
        "Cannot change charging state during delivery",
      );
    }

    if (agv.status === "error") {
      throw new HttpError(
        409,
        "Cannot change charging state while AGV is in error",
      );
    }

    if (charging && agv.status !== "idle") {
      throw new HttpError(409, "AGV must be idle to start charging");
    }

    if (!charging && agv.status !== "charging") {
      throw new HttpError(409, "AGV is not charging");
    }

    if (charging && agv.battery_level >= 100) {
      throw new HttpError(409, "AGV battery is already full");
    }

    const newStatus = charging ? "charging" : "idle";

    const updated = await client.query<AgvRow>(
      `UPDATE agv_state
       SET status = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [agvId, newStatus],
    );

    await log(
      {
        level: "info",
        category: "device",
        source: "agv",
        actor,
        message: `AGV ${agvId} ${charging ? "started" : "stopped"} charging`,
        details: { agvId, charging, simulation: true },
      },
      client,
    );

    await client.query("COMMIT");
    return mapAgvRow(updated.rows[0]!);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAgvHeartbeatTransaction(
  agvId: string,
): Promise<AgvState> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<AgvRow>(
      `SELECT * FROM agv_state WHERE id = $1 FOR UPDATE`,
      [agvId],
    );

    const agv = result.rows[0];

    if (!agv) {
      throw new HttpError(404, "AGV not found");
    }

    const updated = await client.query<AgvRow>(
      `UPDATE agv_state
       SET last_heartbeat = CURRENT_TIMESTAMP,
           heartbeat_alert_active = false,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [agvId],
    );

    if (agv.heartbeat_alert_active) {
      await log(
        {
          level: "info",
          category: "device",
          source: "agv",
          actor: "system",
          message: `AGV ${agvId} heartbeat restored`,
          details: { agvId, simulation: true },
        },
        client,
      );
    }

    await client.query("COMMIT");
    return mapAgvRow(updated.rows[0]!);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function checkAgvHeartbeats(
  timeoutSeconds = 60,
): Promise<string[]> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<{ id: string }>(
      `UPDATE agv_state
       SET heartbeat_alert_active = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE last_heartbeat IS NOT NULL
         AND last_heartbeat <
             CURRENT_TIMESTAMP - ($1 * INTERVAL '1 second')
         AND heartbeat_alert_active = false
       RETURNING id`,
      [timeoutSeconds],
    );

    for (const agv of result.rows) {
      await log(
        {
          level: "warn",
          category: "device",
          source: "agv",
          actor: "system",
          message: `AGV ${agv.id} heartbeat timeout`,
          details: {
            agvId: agv.id,
            timeoutSeconds,
            simulation: true,
          },
        },
        client,
      );
    }

    await client.query("COMMIT");

    return result.rows.map((row) => row.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function setAgvErrorTransaction(
  agvId: string,
  reason: string,
  actor: string,
): Promise<AgvState> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<AgvRow>(
      `SELECT * FROM agv_state WHERE id = $1 FOR UPDATE`,
      [agvId],
    );

    const agv = result.rows[0];

    if (!agv) {
      throw new HttpError(404, "AGV not found");
    }

    if (agv.status === "in_progress") {
      throw new HttpError(
        409,
        "Cannot simulate an error during an active delivery",
      );
    }

    if (agv.status === "error") {
      throw new HttpError(409, "AGV is already in error state");
    }

    const updated = await client.query<AgvRow>(
      `UPDATE agv_state
       SET status = 'error',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [agvId],
    );

    await log(
      {
        level: "error",
        category: "device",
        source: "agv",
        actor,
        message: `AGV ${agvId} entered error state`,
        details: { agvId, reason, simulation: true },
      },
      client,
    );

    await client.query("COMMIT");
    return mapAgvRow(updated.rows[0]!);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function recoverAgvTransaction(
  agvId: string,
  actor: string,
): Promise<AgvState> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<AgvRow>(
      `SELECT * FROM agv_state WHERE id = $1 FOR UPDATE`,
      [agvId],
    );

    const agv = result.rows[0];

    if (!agv) {
      throw new HttpError(404, "AGV not found");
    }

    if (agv.status !== "error") {
      throw new HttpError(409, "AGV is not in error state");
    }

    if (agv.current_pallet_id !== null) {
      throw new HttpError(
        409,
        "Cannot recover AGV with an assigned pallet",
      );
    }

    const updated = await client.query<AgvRow>(
      `UPDATE agv_state
       SET status = 'idle',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [agvId],
    );

    await log(
      {
        level: "info",
        category: "device",
        source: "agv",
        actor,
        message: `AGV ${agvId} recovered from error`,
        details: { agvId, simulation: true },
      },
      client,
    );

    await client.query("COMMIT");
    return mapAgvRow(updated.rows[0]!);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
