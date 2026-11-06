import { pool } from "../../db/pool.js";
import { log } from "../../shared/logger.js";

interface AsrsRow {
  id: string;
  last_heartbeat: Date | null;
  heartbeat_started_at: Date;
  heartbeat_alert_active: boolean;
  updated_at: Date;
}

function mapState(row: AsrsRow) {
  return {
    id: row.id,
    lastHeartbeat: row.last_heartbeat?.toISOString() ?? null,
    heartbeatAlertActive: row.heartbeat_alert_active,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getAsrsState() {
  const result = await pool.query<AsrsRow>(
    "SELECT * FROM asrs_device_state WHERE id = 'asrs'",
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("ASRS device state is not initialized");
  }

  return mapState(row);
}

export async function getAsrsHeartbeatStatus() {
  const result = await pool.query<
    AsrsRow & { online: boolean }
  >(
    `SELECT *,
       (
         last_heartbeat IS NOT NULL
         AND last_heartbeat >=
             CURRENT_TIMESTAMP - INTERVAL '60 seconds'
       ) AS online
     FROM asrs_device_state
     WHERE id = 'asrs'`,
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("ASRS device state is not initialized");
  }

  return {
    ...mapState(row),
    online: row.online,
    timeoutSeconds: 60,
  };
}

export async function receiveAsrsHeartbeat() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const previous = await client.query<AsrsRow>(
      `SELECT *
       FROM asrs_device_state
       WHERE id = 'asrs'
       FOR UPDATE`,
    );

    const row = previous.rows[0];

    if (!row) {
      throw new Error("ASRS device state is not initialized");
    }

    const updated = await client.query<AsrsRow>(
      `UPDATE asrs_device_state
       SET last_heartbeat = CURRENT_TIMESTAMP,
           heartbeat_alert_active = false,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 'asrs'
       RETURNING *`,
    );

    if (row.heartbeat_alert_active) {
      await log(
        {
          level: "info",
          category: "device",
          source: "asrs",
          actor: "system",
          message: "ASRS heartbeat restored",
        },
        client,
      );
    }

    await client.query("COMMIT");

    return mapState(updated.rows[0]!);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function checkAsrsHeartbeat(
  timeoutSeconds = 60,
): Promise<boolean> {
  if (
    !Number.isInteger(timeoutSeconds) ||
    timeoutSeconds < 1 ||
    timeoutSeconds > 86_400
  ) {
    throw new Error("Invalid ASRS heartbeat timeout");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE asrs_device_state
       SET heartbeat_alert_active = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 'asrs'
         AND heartbeat_alert_active = false
         AND COALESCE(last_heartbeat, heartbeat_started_at) <
             CURRENT_TIMESTAMP - ($1 * INTERVAL '1 second')
       RETURNING id`,
      [timeoutSeconds],
    );

    const newlyTimedOut = result.rowCount === 1;

    if (newlyTimedOut) {
      await log(
        {
          level: "warn",
          category: "device",
          source: "asrs",
          actor: "system",
          message: "ASRS heartbeat timeout",
          details: { timeoutSeconds },
        },
        client,
      );
    }

    await client.query("COMMIT");
    return newlyTimedOut;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}