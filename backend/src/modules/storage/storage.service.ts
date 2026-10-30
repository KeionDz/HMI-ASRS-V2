import { findStorageSlots } from "./storage.repository.js";
import type {
  StorageFilters,
  StorageSlot,
} from "./storage.types.js";

export async function listStorageSlots(
  filters: StorageFilters,
): Promise<StorageSlot[]> {
  return findStorageSlots(filters);
}
