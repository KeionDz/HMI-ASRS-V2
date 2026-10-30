
import { HttpError } from "../../shared/errors.js";
import type {
  LiftDirection,
  ScissorLiftState,
} from "./scissor-lift.types.js";

export function validateLiftMovement(
  current: ScissorLiftState,
  direction: LiftDirection,
): void {
  if (direction !== "up" && direction !== "down") {
    throw new HttpError(400, "Direction must be up or down");
  }

  if (current.emergencyStopped) {
    throw new HttpError(409, "Lift is emergency stopped");
  }

  if (current.status === "error") {
    throw new HttpError(409, "Lift is in an error state");
  }

  if (
    current.status === "moving_up" ||
    current.status === "moving_down"
  ) {
    throw new HttpError(409, "Lift is already moving");
  }

  const targetPosition = direction === "up" ? "upper" : "lower";

  if (current.position === targetPosition) {
    throw new HttpError(
      409,
      `Lift is already at ${targetPosition}`,
    );
  }
}
