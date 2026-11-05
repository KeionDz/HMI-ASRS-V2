import {
  findStorageSlots,
  lockPalletTransaction,
  removePalletContentTransaction,
  savePalletContentTransaction,
  unlockPalletTransaction,
} from "./storage.repository.js";
import type {
  PalletContentUpdate,
  PalletLockState,
  StorageFilters,
  StorageSlot,
} from "./storage.types.js";

export async function listStorageSlots(
  filters: StorageFilters,
): Promise<StorageSlot[]> {
  return findStorageSlots(filters);
}

export async function savePalletContent(
  palletId: string,
  inventoryItemId: number,
  quantity: number,
  actor = "operator",
): Promise<PalletContentUpdate> {
  return savePalletContentTransaction(
    palletId,
    inventoryItemId,
    quantity,
    actor,
  );
}

export async function removePalletContent(
  palletId: string,
  inventoryItemId: number,
  actor = "operator",
): Promise<void> {
  return removePalletContentTransaction(palletId, inventoryItemId, actor);
}

export async function lockPallet(
  palletId: string,
  actor = "operator",
): Promise<PalletLockState> {
  return lockPalletTransaction(palletId, actor);
}

export async function unlockPallet(
  palletId: string,
  adminOverride: boolean,
  actor = "operator",
): Promise<PalletLockState> {
  return unlockPalletTransaction(palletId, actor, adminOverride);
}
