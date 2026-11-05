export const STORAGE_STATUSES = [
  "available",
  "occupied",
  "post-event",
  "retrieved",
] as const;

export type StorageStatus = (typeof STORAGE_STATUSES)[number];

export interface PalletContent {
  inventoryItemId: number;
  name: string;
  quantity: number;
}

export interface StorageSlot {
  id: string;
  level: number;
  row: number;
  slot: number;
  status: StorageStatus;
  items: number;
  weight: number;
  eventId: string | null;
  description: string;
  locked: boolean;
  lockedBy: string | null;
  lockedAt: Date | null;
  contents: PalletContent[];
}

export interface StorageFilters {
  level?: number;
  status?: StorageStatus;
}

export interface StoragePalletState {
  id: string;
  eventId: string | null;
  locked: boolean;
  lockedBy: string | null;
  lockedAt: Date | null;
}

export interface PalletContentUpdate extends PalletContent {
  palletId: string;
}

export interface PalletLockState {
  palletId: string;
  locked: boolean;
  lockedBy: string | null;
  lockedAt: Date | null;
}
