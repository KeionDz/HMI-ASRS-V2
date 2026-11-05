import {
  assignPalletTransaction,
  findEventChecklist,
  findUpcomingEvents,
  removeChecklistItemTransaction,
  removePalletAssignmentTransaction,
  saveChecklistItemTransaction,
} from "./events.repository.js";
import type {
  EventChecklistItem,
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

export async function getEventChecklist(
  eventId: string,
): Promise<EventChecklistItem[]> {
  return findEventChecklist(eventId);
}

export async function saveChecklistItem(
  eventId: string,
  inventoryItemId: number,
  requiredQuantity: number,
  actor = "operator",
): Promise<EventChecklistItem> {
  return saveChecklistItemTransaction(
    eventId,
    inventoryItemId,
    requiredQuantity,
    actor,
  );
}

export async function removeChecklistItem(
  eventId: string,
  inventoryItemId: number,
  actor = "operator",
): Promise<void> {
  return removeChecklistItemTransaction(eventId, inventoryItemId, actor);
}
