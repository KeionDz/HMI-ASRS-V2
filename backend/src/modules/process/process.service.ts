import type { PoolClient } from "pg";
import {
  getStatus,
  moveLift,
} from "../scissor-lift/scissor-lift.service.js";
import { HttpError } from "../../shared/errors.js";
import {
  advanceProcessRunTransaction,
  createProcessRunTransaction,
  findProcessRun,
  findProcessRuns,
  reportPalletErrorTransaction,
  reportRunErrorTransaction,
  resumeProcessRunTransaction,
  stopProcessRunTransaction,
} from "./process.repository.js";
import type {
  CreateProcessRunInput,
  ProcessErrorInput,
  ProcessPallet,
  ProcessRun,
} from "./process.types.js";

async function chooseAgv(
  run: ProcessRun,
  client: PoolClient,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `SELECT id
     FROM agv_state
     WHERE status = 'idle'
       AND current_pallet_id IS NULL
       AND battery_level >= 20
       AND heartbeat_alert_active = false
       AND last_heartbeat IS NOT NULL
       AND last_heartbeat >=
           CURRENT_TIMESTAMP - INTERVAL '60 seconds'
       AND (
         reserved_process_run_id IS NULL
         OR reserved_process_run_id = $1
       )
       AND ($2::text IS NULL OR id = $2)
       AND (
         reserved_process_run_id = $1
         OR NOT EXISTS (
           SELECT 1
           FROM agv_state
           WHERE reserved_process_run_id = $1
         )
       )
     ORDER BY
       (reserved_process_run_id = $1) DESC NULLS LAST,
       battery_level DESC,
       id ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED`,
    [run.id, run.requestedAgvId],
  );

  const agv = result.rows[0];

  if (!agv) {
    throw new HttpError(
      409,
      "No available AGV with a fresh heartbeat for this process",
    );
  }

  await client.query(
    `UPDATE agv_state
     SET reserved_process_run_id = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [run.id, agv.id],
  );

  return agv.id;
}

async function performSimulatedStep(
  run: ProcessRun,
  pallet: ProcessPallet,
  actor: string,
  client: PoolClient,
): Promise<{ agvId?: string }> {
  switch (pallet.currentStep) {
    case "agv_dispatched":
      return { agvId: await chooseAgv(run, client) };
    case "lift_up": {
      const lift = await getStatus();
      if (lift.position !== "upper") await moveLift("up", actor);
      return {};
    }
    case "lift_down": {
      const lift = await getStatus();
      if (lift.position !== "lower") await moveLift("down", actor);
      return {};
    }
    default:
      // ASRS, shutter, arrival, and profile calls remain simulated until APIs arrive.
      return {};
  }
}

export function createProcessRun(
  input: CreateProcessRunInput,
): Promise<ProcessRun> {
  return createProcessRunTransaction(input);
}

export function listProcessRuns(): Promise<ProcessRun[]> {
  return findProcessRuns();
}

export function getProcessRun(runId: number): Promise<ProcessRun> {
  return findProcessRun(runId);
}

export function continueProcessRun(
  runId: number,
  actor: string,
): Promise<ProcessRun> {
  return advanceProcessRunTransaction(
    runId,
    actor,
    (run, pallet, client) =>
      performSimulatedStep(run, pallet, actor, client),
  );
}

export function stopProcessRun(
  runId: number,
  actor: string,
): Promise<ProcessRun> {
  return stopProcessRunTransaction(runId, actor);
}

export function reportProcessError(
  runId: number,
  input: ProcessErrorInput,
): Promise<ProcessRun> {
  return reportRunErrorTransaction(runId, input.message, input.actor);
}

export function reportPalletError(
  runId: number,
  palletId: string,
  input: ProcessErrorInput,
): Promise<ProcessRun> {
  return reportPalletErrorTransaction(
    runId,
    palletId,
    input.message,
    input.actor,
  );
}

export function resumeProcessRun(
  runId: number,
  actor: string,
): Promise<ProcessRun> {
  return resumeProcessRunTransaction(runId, actor);
}
