
import { HttpError } from "../../shared/errors.js";
import { log } from "../../shared/logger.js";
import {
  getLiftState,
  updateLiftState,
} from "./scissor-lift.repository.js";
import type {
  LiftDirection,
  ScissorLiftState,
} from "./scissor-lift.types.js";

export async function getStatus(): Promise<ScissorLiftState> {
  return getLiftState();
}

export async function moveLift(
  direction: LiftDirection,
  actor = "operator",
): Promise<ScissorLiftState> {
  if (direction !== "up" && direction !== "down") {
    throw new HttpError(400, "Direction must be up or down");
  }

  const current = await getLiftState();

  if (current.emergencyStopped) {
    throw new HttpError(409, "Lift is emergency stopped");
  }

  if (current.status === "error") {
    throw new HttpError(409, "Lift is in an error state");
  }

  if (current.status === "moving_up" ||
      current.status === "moving_down") {
    throw new HttpError(409, "Lift is already moving");
  }

  const targetPosition = direction === "up" ? "upper" : "lower";

  if (current.position === targetPosition) {
    throw new HttpError(409, `Lift is already at ${targetPosition}`);
  }

  // Instant simulated movement, without physical equipment.
  const updated = await updateLiftState({
    position: targetPosition,
    status: "idle",
  });

  await log({
    level: "info",
    category: "device",
    source: "scissor-lift",
    actor,
    message: `Simulated lift moved ${direction}`,
    details: {
      previousPosition: current.position,
      newPosition: updated.position,
      simulation: true,
    },
  });

  return updated;
}

export async function stopLift(
  actor = "operator",
): Promise<ScissorLiftState> {
  const updated = await updateLiftState({
    status: "stopped",
    emergencyStopped: true,
  });

  await log({
    level: "warn",
    category: "device",
    source: "scissor-lift",
    actor,
    message: "Simulated lift emergency stop activated",
    details: {
      position: updated.position,
      simulation: true,
    },
  });

  return updated;
}

export async function resumeLift(
  actor = "operator",
): Promise<ScissorLiftState> {
  const current = await getLiftState();

  if (!current.emergencyStopped) {
    throw new HttpError(409, "Lift is not emergency stopped");
  }

  const updated = await updateLiftState({
    status: "idle",
    emergencyStopped: false,
  });

  await log({
    level: "info",
    category: "device",
    source: "scissor-lift",
    actor,
    message: "Simulated lift resumed",
    details: {
      position: updated.position,
      simulation: true,
    },
  });

  return updated;
}
