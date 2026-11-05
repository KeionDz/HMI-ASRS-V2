import {
  findStorageSlots,
  removePalletContentTransaction,
  savePalletContentTransaction,
} from "./storage.repository.js";
import type {
  PalletContentUpdate,
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
