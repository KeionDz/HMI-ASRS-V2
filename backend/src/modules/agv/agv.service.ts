
import {
  findAllAgvs,
  findAgvById,
  dispatchAgvTransaction,
  completeAgvTransaction,
  updateAgvBatteryTransaction,
  setAgvChargingTransaction,
  updateAgvHeartbeatTransaction,
  checkAgvHeartbeats,
  setAgvErrorTransaction,
  recoverAgvTransaction,
} from "./agv.repository.js";

import type { AgvState } from "./agv.types.js";
import { HttpError } from "../../shared/errors.js";
import type { PoolClient } from "pg";

export async function getAllAgvs(): Promise<AgvState[]> {
  return findAllAgvs();
}

export async function getAgvById(
  id: string,
): Promise<AgvState | null> {
  return findAgvById(id);
}

export interface DispatchRequest {
  palletId: string;
  actor: string;
  agvId?: string;
}

export async function dispatchAgv(
  input: DispatchRequest,
  transactionClient?: PoolClient,
): Promise<AgvState> {
  if (
    typeof input.palletId !== "string" ||
    !input.palletId.trim()
  ) {
    throw new HttpError(400, "palletId is required");
  }

  if (
    typeof input.actor !== "string" ||
    !input.actor.trim()
  ) {
    throw new HttpError(400, "actor is required");
  }

  if (
    input.agvId !== undefined &&
    (typeof input.agvId !== "string" ||
      !["agv-1", "agv-2"].includes(input.agvId))
  ) {
    throw new HttpError(400, "Invalid AGV ID");
  }

  return dispatchAgvTransaction(
    {
      palletId: input.palletId.trim(),
      actor: input.actor.trim(),
      agvId: input.agvId,
    },
    transactionClient,
  );
}



export async function completeAgv(
  agvId: string,
  actor: string,
): Promise<AgvState> {
  if (!["agv-1", "agv-2"].includes(agvId)) {
    throw new HttpError(400, "Invalid AGV ID");
  }

  if (typeof actor !== "string" || !actor.trim()) {
    throw new HttpError(400, "actor is required");
  }

  return completeAgvTransaction(agvId, actor.trim());
}


export async function updateAgvBattery(
  agvId: string,
  batteryLevel: number,
  actor: string,
): Promise<AgvState> {
  if (!["agv-1", "agv-2"].includes(agvId)) {
    throw new HttpError(400, "Invalid AGV ID");
  }

  if (
    typeof batteryLevel !== "number" ||
    !Number.isInteger(batteryLevel) ||
    batteryLevel < 0 ||
    batteryLevel > 100
  ) {
    throw new HttpError(
      400,
      "batteryLevel must be an integer between 0 and 100",
    );
  }

  if (typeof actor !== "string" || !actor.trim()) {
    throw new HttpError(400, "actor is required");
  }

  return updateAgvBatteryTransaction(
    agvId,
    batteryLevel,
    actor.trim(),
  );
}



function validateAgvId(agvId: string): void {
  if (!["agv-1", "agv-2"].includes(agvId)) {
    throw new HttpError(400, "Invalid AGV ID");
  }
}

function validateActor(actor: string): void {
  if (typeof actor !== "string" || !actor.trim()) {
    throw new HttpError(400, "actor is required");
  }
}

export async function setAgvCharging(
  agvId: string,
  charging: boolean,
  actor: string,
): Promise<AgvState> {
  validateAgvId(agvId);
  validateActor(actor);

  if (typeof charging !== "boolean") {
    throw new HttpError(400, "charging must be a boolean");
  }

  return setAgvChargingTransaction(agvId, charging, actor.trim());
}

export async function updateAgvHeartbeat(
  agvId: string,
): Promise<AgvState> {
  validateAgvId(agvId);
  return updateAgvHeartbeatTransaction(agvId);
}

export async function monitorAgvHeartbeats(): Promise<string[]> {
  return checkAgvHeartbeats(60);
}

export async function setAgvError(
  agvId: string,
  reason: string,
  actor: string,
): Promise<AgvState> {
  validateAgvId(agvId);
  validateActor(actor);

  if (typeof reason !== "string" || !reason.trim()) {
    throw new HttpError(400, "reason is required");
  }

  return setAgvErrorTransaction(agvId, reason.trim(), actor.trim());
}

export async function recoverAgv(
  agvId: string,
  actor: string,
): Promise<AgvState> {
  validateAgvId(agvId);
  validateActor(actor);

  return recoverAgvTransaction(agvId, actor.trim());
}
