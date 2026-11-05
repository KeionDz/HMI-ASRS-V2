import { pool } from "../../db/pool.js";
import { HttpError } from "../../shared/errors.js";
import { log } from "../../shared/logger.js";
import { dispatchAgv } from "../agv/agv.service.js";

interface DueSchedule {
  id: number;
  kind: "maintenance" | "dispatch";
  agv_id: string | null;
  pallet_id: string | null;
  actor: string;
}

interface MaintenanceRow {
  id: string;
  status: string;
  battery_level: number;
  current_pallet_id: string | null;
  last_heartbeat: Date | null;
  heartbeat_alert_active: boolean;
  heartbeat_fresh: boolean;
}

export async function executeNextDueSchedule(): Promise<boolean> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const due = await client.query<DueSchedule>(
      `SELECT id, kind, agv_id, pallet_id, actor
       FROM schedules
       WHERE status = 'pending'
         AND enabled = true
         AND scheduled_at <= CURRENT_TIMESTAMP
       ORDER BY scheduled_at ASC, id ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
    );

    const schedule = due.rows[0];

    if (!schedule) {
      await client.query("COMMIT");
      return false;
    }

    // Keep the schedule lock while allowing a failed action
    // to roll back before recording its failure.
    await client.query("SAVEPOINT schedule_action");

    let status: "completed" | "failed" = "completed";
    let result: Record<string, unknown>;

    try {
      if (schedule.kind === "dispatch") {
        if (!schedule.pallet_id) {
          throw new HttpError(400, "Dispatch schedule has no pallet");
        }

        const agv = await dispatchAgv(
          {
            palletId: schedule.pallet_id,
            actor: schedule.actor,
            agvId: schedule.agv_id ?? undefined,
          },
          client,
        );

        result = {
          agvId: agv.id,
          palletId: agv.currentPalletId,
          destination: agv.destination,
          simulation: true,
        };
      } else {
        const checked = await client.query<MaintenanceRow>(
          `SELECT id,
                  status,
                  battery_level,
                  current_pallet_id,
                  last_heartbeat,
                  heartbeat_alert_active,
                  (
                    last_heartbeat IS NOT NULL
                    AND last_heartbeat >=
                      CURRENT_TIMESTAMP - INTERVAL '60 seconds'
                  ) AS heartbeat_fresh
           FROM agv_state
           WHERE id = $1
           FOR UPDATE`,
          [schedule.agv_id],
        );

        const agv = checked.rows[0];

        if (!agv) {
          throw new HttpError(404, "AGV not found");
        }

        const issues: string[] = [];

        if (agv.status === "error") {
          issues.push("AGV is in error state");
        }

        if (
          agv.status === "in_progress" ||
          agv.current_pallet_id !== null
        ) {
          issues.push("AGV has an active delivery");
        }

        if (agv.battery_level < 20) {
          issues.push("Battery is below 20%");
        }

        if (agv.heartbeat_alert_active || !agv.heartbeat_fresh) {
          issues.push("Heartbeat is missing or stale");
        }

        result = {
          agvId: agv.id,
          checkType: "software_status",
          passed: issues.length === 0,
          issues,
          status: agv.status,
          batteryLevel: agv.battery_level,
          lastHeartbeat: agv.last_heartbeat?.toISOString() ?? null,
          physicalMaintenancePerformed: false,
        };
      }
    } catch (error) {
      // Unexpected database/system failures roll back the whole job.
      // The pending schedule can then be retried on a later tick.
      if (!(error instanceof HttpError)) {
        throw error;
      }

      await client.query("ROLLBACK TO SAVEPOINT schedule_action");

      status = "failed";
      result = {
        message: error.message,
        statusCode: error.statusCode,
      };
    }

    await client.query("RELEASE SAVEPOINT schedule_action");

    await client.query(
      `UPDATE schedules
       SET status = $2,
           result = $3::jsonb,
           executed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [schedule.id, status, JSON.stringify(result)],
    );

    await log(
      {
        level:
          status === "failed" || result.passed === false
            ? "warn"
            : "info",
        category: "process",
        source: "schedule",
        actor: schedule.actor,
        message: `Schedule ${schedule.id} ${status}`,
        details: {
          scheduleId: schedule.id,
          kind: schedule.kind,
          executor: "system",
          result,
        },
      },
      client,
    );

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function executeDueSchedules(
  limit = 20,
): Promise<number> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Executor limit must be between 1 and 100");
  }

  let processed = 0;

  while (processed < limit && await executeNextDueSchedule()) {
    processed += 1;
  }

  return processed;
}