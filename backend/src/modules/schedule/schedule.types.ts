export type ScheduleKind = "maintenance" | "dispatch";

export type ScheduleStatus =
  | "pending"
  | "completed"
  | "failed"
  | "cancelled";

export interface ScheduleInput {
  kind: ScheduleKind;
  agvId: string | null;
  palletId: string | null;
  scheduledAt: string;
  enabled: boolean;
  actor: string;
}

export interface Schedule extends ScheduleInput {
  id: number;
  status: ScheduleStatus;
  result: Record<string, unknown> | null;
  executedAt: string | null;
  createdAt: string;
  updatedAt: string;
}