export type AssetLocation = "inside" | "outside" | "unknown";
export interface Asset {
  id: string;
  bleTag: string;
  name: string;
  location: AssetLocation;
  batteryLevel: number | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface Reading {
  bleTag: string;
  location: "inside" | "outside";
  batteryLevel?: number;
  readerId?: string;
}
