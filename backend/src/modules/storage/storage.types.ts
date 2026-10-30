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
  contents: PalletContent[];
}

export interface StorageFilters {
  level?: number;
  status?: StorageStatus;
}
