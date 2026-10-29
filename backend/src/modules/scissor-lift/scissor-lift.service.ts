
import { HttpError } from "../../shared/errors.js";
import { log } from "../../shared/logger.js";

import {
  getLiftState,
  updateLiftState,
  updateLiftHeartbeat,
  markLiftHeartbeatMissed,
  clearLiftHeartbeatAlert,
  moveLiftTransaction,
  stopLiftTransaction,
  resumeLiftTransaction,
  receiveLiftHeartbeatTransaction,
  checkLiftHeartbeatTransaction,
} from "./scissor-lift.repository.js";

import type {
  LiftDirection,
  ScissorLiftState,
} from "./scissor-lift.types.js";

// ========================================
// GET SCISSOR LIFT STATUS
// ========================================

export async function getStatus(): Promise<ScissorLiftState> {
  return getLiftState();
}

// ========================================
// MOVE SCISSOR LIFT UP / DOWN
// ========================================

export async function moveLift(
  direction: LiftDirection,
  actor = "operator",
): Promise<ScissorLiftState> {
  if (direction !== "up" && direction !== "down") {
    throw new HttpError(400, "Direction must be up or down");
  }

  // Movement validation, database update,
// and logging are handled transactionally.
  return moveLiftTransaction(direction, actor);
}

// ========================================
// EMERGENCY STOP
// ========================================

export async function stopLift(
  actor = "operator",
): Promise<ScissorLiftState> {
  return stopLiftTransaction(actor);
}

// ========================================
// RESUME SCISSOR LIFT
// ========================================

export async function resumeLift(
  actor = "operator",
): Promise<ScissorLiftState> {
  return resumeLiftTransaction(actor);
}

// ========================================
// RECEIVE HEARTBEAT
// ========================================

export async function receiveLiftHeartbeat(): Promise<ScissorLiftState> {
  return receiveLiftHeartbeatTransaction();
}

// ========================================
// CHECK HEARTBEAT STATUS
// ========================================

export async function checkLiftHeartbeat(): Promise<{
  online: boolean;
  lastHeartbeat: string | null;
}> {
  return checkLiftHeartbeatTransaction();
}
