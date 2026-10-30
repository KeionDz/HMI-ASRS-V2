export type EventStatus = "scheduled" | "completed";

export interface EventListItem {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  floor: number;
  guests: number;
  type: string | null;
  status: EventStatus;
  pallets: string[];
}

export interface PalletAssignment {
  palletId: string;
  eventId: string | null;
}

export interface AssignmentEvent {
  id: string;
  status: EventStatus;
}

export interface AssignmentPallet {
  id: string;
  eventId: string | null;
  locked: boolean;
}
