export const PROCESS_MODES = [
  "retrieve_to_venue",
  "retrieve_with_robot",
  "store_back",
] as const;

export type ProcessMode = (typeof PROCESS_MODES)[number];
export type ProcessStatus = "running" | "error" | "stopped" | "completed";
export type ProcessPalletStatus =
  | "pending"
  | "running"
  | "error"
  | "stopped"
  | "completed";

export type ProcessStep =
  | "profile_requested"
  | "agv_dispatched"
  | "lift_up"
  | "lift_down"
  | "shutter_open"
  | "asrs_retrieve"
  | "asrs_store"
  | "venue_delivery";

export interface CreateProcessRunInput {
  mode: ProcessMode;
  eventId: string | null;
  venue: string | null;
  requestedAgvId: string | null;
  palletIds: string[];
  actor: string;
}

export interface ProcessPallet {
  palletId: string;
  sequence: number;
  status: ProcessPalletStatus;
  currentStep: ProcessStep | null;
  originalCell: string;
  originalLevel: number;
  agvId: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ProcessButtons {
  continue: boolean;
  stop: boolean;
  reportRunError: boolean;
  reportPalletError: boolean;
  resume: boolean;
}

export interface ProcessRun {
  id: number;
  mode: ProcessMode;
  eventId: string | null;
  venue: string | null;
  requestedAgvId: string | null;
  status: ProcessStatus;
  currentPalletId: string | null;
  errorMessage: string | null;
  actor: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  pallets: ProcessPallet[];
  buttons: ProcessButtons;
}

export interface ProcessErrorInput {
  message: string;
  actor: string;
}
