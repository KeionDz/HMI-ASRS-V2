import { getAgvById, getAllAgvs } from "../agv/agv.service.js";
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

async function chooseAgv(run: ProcessRun): Promise<string> {
  const choices = run.requestedAgvId
    ? [await getAgvById(run.requestedAgvId)].filter(
        (agv) => agv !== null,
      )
    : await getAllAgvs();
  const agv = choices
    .filter(
      (item) =>
        item.status === "idle" &&
        item.batteryLevel >= 20 &&
        !item.heartbeatAlertActive,
    )
    .sort((a, b) => b.batteryLevel - a.batteryLevel)[0];

  if (!agv) throw new HttpError(409, "No simulated AGV is available");
  return agv.id;
}

async function performSimulatedStep(
  run: ProcessRun,
  pallet: ProcessPallet,
  actor: string,
): Promise<{ agvId?: string }> {
  switch (pallet.currentStep) {
    case "agv_dispatched":
      // shortcut: AGV dispatch rejects event pallets; use AGV state until that contract changes.
      return { agvId: await chooseAgv(run) };
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
  return advanceProcessRunTransaction(runId, actor, (run, pallet) =>
    performSimulatedStep(run, pallet, actor),
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
