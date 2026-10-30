
export type LiftPosition = "lower" | "upper";

export type LiftStatus =
  | "idle"
  | "moving_up"
  | "moving_down"
  | "stopped"
  | "error";

export type LiftDirection = "up" | "down";

export interface ScissorLiftState {
  id: string;
  position: LiftPosition;
  status: LiftStatus;
  emergencyStopped: boolean;
  lastHeartbeat: string | null;
  updatedAt: string;
}

export interface MoveLiftInput {
  direction: LiftDirection;
  actor: string;
}
