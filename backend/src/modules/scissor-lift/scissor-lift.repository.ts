
import { pool } from "../../db/pool.js";
import type { ScissorLiftState } from "./scissor-lift.types.js";

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
