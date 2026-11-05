
export type AgvStatus =
  | "idle"
  | "in_progress"
  | "charging"
  | "error";

export interface AgvState {
  id: string;
  status: AgvStatus;
  batteryLevel: number;
  currentPalletId: string | null;
  destination: string | null;
  lastHeartbeat: string | null;
  heartbeatAlertActive: boolean;
  updatedAt: string;
}
