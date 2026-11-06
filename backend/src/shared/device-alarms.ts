import { pool } from "../db/pool.js";
import { HttpError } from "./errors.js";
import { log } from "./logger.js";

const DEVICE_IDS = [
  "agv-1",
  "agv-2",
  "scissor-lift",
  "asrs",
] as const;

type DeviceId = (typeof DEVICE_IDS)[number];

export async function getDeviceAlarms(deviceId: unknown) {
  if (
    typeof deviceId !== "string" ||
    !DEVICE_IDS.includes(deviceId as DeviceId)
  ) {
    throw new HttpError(400, "Invalid deviceId");
  }

  const result = await pool.query<{
    deviceId: string;
    code: string;
    severity: "warn" | "error";
    message: string;
    active: boolean;
    updatedAt: Date;
  }>(
    `SELECT device_id AS "deviceId",
            code,
            severity,
            message,
            active,
            updated_at AS "updatedAt"
     FROM device_alarms
     WHERE device_id = $1
       AND active = true
     ORDER BY severity ASC, code ASC`,
    [deviceId],
  );

  return result.rows.map((row) => ({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export interface DeviceAlarmInput {
  deviceId: DeviceId;
  code: string;
  severity: "warn" | "error";
  message: string;
  active: boolean;
}

function parseText(
  value: unknown,
  field: string,
  limit: number,
): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > limit
  ) {
    throw new HttpError(
      400,
      `${field} must contain 1 to ${limit} characters`,
    );
  }

  return value.trim();
}

export function parseDeviceAlarm(value: unknown): DeviceAlarmInput {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new HttpError(400, "Alarm must be an object");
  }

  const body = value as Record<string, unknown>;

  if (
    typeof body.deviceId !== "string" ||
    !DEVICE_IDS.includes(body.deviceId as DeviceId)
  ) {
    throw new HttpError(400, "Invalid alarm deviceId");
  }

  if (body.severity !== "warn" && body.severity !== "error") {
    throw new HttpError(400, "severity must be warn or error");
  }

  if (typeof body.active !== "boolean") {
    throw new HttpError(400, "active must be a boolean");
  }

  return {
    deviceId: body.deviceId as DeviceId,
    code: parseText(body.code, "code", 100),
    severity: body.severity,
    message: parseText(body.message, "message", 500),
    active: body.active,
  };
}

export async function ingestDeviceAlarm(value: unknown): Promise<{
  changed: boolean;
  alarm: DeviceAlarmInput;
}> {
  const alarm = parseDeviceAlarm(value);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Establish a row that concurrent receivers can lock.
    const inserted = await client.query(
      `INSERT INTO device_alarms (
         device_id, code, severity, message, active
       )
       VALUES ($1, $2, $3, $4, false)
       ON CONFLICT (device_id, code) DO NOTHING
       RETURNING device_id`,
      [
        alarm.deviceId,
        alarm.code,
        alarm.severity,
        alarm.message,
      ],
    );

    const previousResult = await client.query<{
      severity: "warn" | "error";
      message: string;
      active: boolean;
    }>(
      `SELECT severity, message, active
       FROM device_alarms
       WHERE device_id = $1 AND code = $2
       FOR UPDATE`,
      [alarm.deviceId, alarm.code],
    );

    const previous = previousResult.rows[0]!;

    const changed =
      previous.active !== alarm.active ||
      previous.severity !== alarm.severity ||
      previous.message !== alarm.message;

    if (changed) {
      await client.query(
        `UPDATE device_alarms
         SET severity = $3,
             message = $4,
             active = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE device_id = $1 AND code = $2`,
        [
          alarm.deviceId,
          alarm.code,
          alarm.severity,
          alarm.message,
          alarm.active,
        ],
      );

      const action =
        previous.active !== alarm.active
          ? alarm.active
            ? "raised"
            : "cleared"
          : "updated";

      await log(
        {
          level: alarm.active ? alarm.severity : "info",
          category: "device",
          source: alarm.deviceId.startsWith("agv-")
            ? "agv"
            : alarm.deviceId,
          actor: "mqtt",
          message: `Device alarm ${action}: ${alarm.code}`,
          details: {
            ...alarm,
            previousActive: previous.active,
            previousSeverity: previous.severity,
            previousMessage: previous.message,
            firstObservation: inserted.rowCount === 1,
          },
        },
        client,
      );
    }

    await client.query("COMMIT");
    return { changed, alarm };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}