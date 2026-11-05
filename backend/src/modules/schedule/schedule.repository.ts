import type { PoolClient } from "pg";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../shared/errors.js";
import { log } from "../../shared/logger.js";

import type {
  Schedule,
  ScheduleInput,
  ScheduleKind,
  ScheduleStatus,
} from "./schedule.types.js";

interface ScheduleRow {
  id: number;
  kind: ScheduleKind;
  agv_id: string | null;
  pallet_id: string | null;
  scheduled_at: Date;
  enabled: boolean;
  status: ScheduleStatus;
  actor: string;
  result: Record<string, unknown> | null;
  executed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    kind: row.kind,
    agvId: row.agv_id,
    palletId: row.pallet_id,
    scheduledAt: row.scheduled_at.toISOString(),
    enabled: row.enabled,
    status: row.status,
    actor: row.actor,
    result: row.result,
    executedAt: row.executed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function transaction<T>(
  action: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await action(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function logChange(
  client: PoolClient,
  schedule: Schedule,
  actor: string,
  action: string,
): Promise<void> {
  await log(
    {
      level: "info",
      category: "audit",
      source: "schedule",
      actor,
      message: `Schedule ${schedule.id} ${action}`,
      details: {
        scheduleId: schedule.id,
        kind: schedule.kind,
        agvId: schedule.agvId,
        palletId: schedule.palletId,
        scheduledAt: schedule.scheduledAt,
        enabled: schedule.enabled,
        status: schedule.status,
      },
    },
    client,
  );
}

async function lockPendingSchedule(
  client: PoolClient,
  id: number,
): Promise<void> {
  const result = await client.query<ScheduleRow>(
    `SELECT *
     FROM schedules
     WHERE id = $1
     FOR UPDATE`,
    [id],
  );

  const row = result.rows[0];

  if (!row) {
    throw new HttpError(404, "Schedule not found");
  }

  if (row.status !== "pending") {
    throw new HttpError(
      409,
      "Only pending schedules can be changed",
    );
  }
}

export async function findSchedules(): Promise<Schedule[]> {
  const result = await pool.query<ScheduleRow>(
    `SELECT *
     FROM schedules
     ORDER BY scheduled_at ASC, id ASC
     LIMIT 200`,
  );

  return result.rows.map(mapSchedule);
}

export async function findScheduleById(
  id: number,
): Promise<Schedule | null> {
  const result = await pool.query<ScheduleRow>(
    "SELECT * FROM schedules WHERE id = $1",
    [id],
  );

  const row = result.rows[0];
  return row ? mapSchedule(row) : null;
}

export async function createScheduleTransaction(
  input: ScheduleInput,
): Promise<Schedule> {
  return transaction(async (client) => {
    const result = await client.query<ScheduleRow>(
      `INSERT INTO schedules (
         kind,
         agv_id,
         pallet_id,
         scheduled_at,
         enabled,
         actor
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.kind,
        input.agvId,
        input.palletId,
        input.scheduledAt,
        input.enabled,
        input.actor,
      ],
    );

    const schedule = mapSchedule(result.rows[0]!);

    await logChange(client, schedule, input.actor, "created");

    return schedule;
  });
}

export async function updateScheduleTransaction(
  id: number,
  input: ScheduleInput,
): Promise<Schedule> {
  return transaction(async (client) => {
    await lockPendingSchedule(client, id);

    const result = await client.query<ScheduleRow>(
      `UPDATE schedules
       SET kind = $2,
           agv_id = $3,
           pallet_id = $4,
           scheduled_at = $5,
           enabled = $6,
           actor = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        id,
        input.kind,
        input.agvId,
        input.palletId,
        input.scheduledAt,
        input.enabled,
        input.actor,
      ],
    );

    const schedule = mapSchedule(result.rows[0]!);

    await logChange(client, schedule, input.actor, "updated");

    return schedule;
  });
}

export async function cancelScheduleTransaction(
  id: number,
  actor: string,
): Promise<Schedule> {
  return transaction(async (client) => {
    await lockPendingSchedule(client, id);

    const result = await client.query<ScheduleRow>(
      `UPDATE schedules
       SET status = 'cancelled',
           enabled = false,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    const schedule = mapSchedule(result.rows[0]!);

    await logChange(client, schedule, actor, "cancelled");

    return schedule;
  });
}