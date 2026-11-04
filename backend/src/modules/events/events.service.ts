import {
  assignPalletTransaction,
  findUpcomingEvents,
  removePalletAssignmentTransaction,
} from "./events.repository.js";
import type {
  EventListItem,
  PalletAssignment,
} from "./events.types.js";

export async function listUpcomingEvents(): Promise<EventListItem[]> {
  return findUpcomingEvents();
}

export async function assignPallet(
  eventId: string,
  palletId: string,
  actor = "operator",
): Promise<PalletAssignment> {
  return assignPalletTransaction(eventId, palletId, actor);
}

export async function removePalletAssignment(
  eventId: string,
  palletId: string,
  actor = "operator",
): Promise<PalletAssignment> {
  return removePalletAssignmentTransaction(eventId, palletId, actor);
}
