import { HttpError } from "../../shared/errors.js";
import type {
  AssignmentEvent,
  AssignmentPallet,
} from "./events.types.js";

export function validatePalletAssignment(
  event: AssignmentEvent,
  pallet: AssignmentPallet,
): void {
  if (pallet.eventId === event.id) return;

  if (event.status === "completed") {
    throw new HttpError(409, "cannot assign a pallet to a completed event");
  }

  if (pallet.locked) {
    throw new HttpError(409, "pallet is locked");
  }

  if (pallet.eventId !== null) {
    throw new HttpError(
      409,
      `pallet is already assigned to event ${pallet.eventId}`,
    );
  }
}

export function validatePalletRemoval(
  eventId: string,
  pallet: AssignmentPallet,
): void {
  if (pallet.eventId === null) return;

  if (pallet.eventId !== eventId) {
    throw new HttpError(
      409,
      `pallet is assigned to event ${pallet.eventId}, not ${eventId}`,
    );
  }

  if (pallet.locked) {
    throw new HttpError(409, "pallet is locked");
  }
}
