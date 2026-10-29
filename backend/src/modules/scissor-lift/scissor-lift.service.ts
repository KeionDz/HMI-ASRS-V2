import { updateLiftHeartbeat } from "./scissor-lift.repository.js";
import { HttpError } from "../../shared/errors.js";
import { log } from "../../shared/logger.js";
import {
  getLiftState,
  updateLiftState,
  markLiftHeartbeatMissed,
  clearLiftHeartbeatAlert,
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



export async function receiveLiftHeartbeat(): Promise<ScissorLiftState> {
  const recovered = await clearLiftHeartbeatAlert();

  const state = await updateLiftHeartbeat();

  if (recovered) {
    await log({
      level: "info",
      category: "device",
      source: "scissor-lift",
      actor: "system",
      message: "Scissor Lift heartbeat restored",
      details: {
        lastHeartbeat: state.lastHeartbeat,
        simulation: true,
      },
    });
  }

  return state;
}




const HEARTBEAT_TIMEOUT_MS = 30_000;

export async function checkLiftHeartbeat(): Promise<{
  online: boolean;
  lastHeartbeat: string | null;
}> {
  const current = await getLiftState();

  const online =
    current.lastHeartbeat !== null &&
    Date.now() - new Date(current.lastHeartbeat).getTime() <=
      HEARTBEAT_TIMEOUT_MS;

  if (!online) {
    const newlyMissed = await markLiftHeartbeatMissed();

    if (newlyMissed) {
      await log({
        level: "warn",
        category: "device",
        source: "scissor-lift",
        actor: "system",
        message: "Scissor Lift heartbeat missed",
        details: {
          lastHeartbeat: current.lastHeartbeat,
          timeoutMs: HEARTBEAT_TIMEOUT_MS,
          simulation: true,
        },
      });
    }
  }

  return {
    online,
    lastHeartbeat: current.lastHeartbeat,
  };
}
