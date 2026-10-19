import { pool } from "../db/pool.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogCategory =
  | "audit"
  | "process"
  | "device"
  | "ingestion"
  | "system";

export interface LogInput {
  level: LogLevel;
  category: LogCategory;
  source: string;
  actor: string;
  message: string;
  palletId?: string;
  eventId?: string;
  details?: Record<string, unknown>;
}

export async function log(entry: LogInput): Promise<void> {
  await pool.query(
    `
      INSERT INTO logs (
        level,
        category,
        source,
        actor,
        pallet_id,
        event_id,
        message,
        details
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      entry.level,
      entry.category,
      entry.source,
      entry.actor,
      entry.palletId ?? null,
      entry.eventId ?? null,
      entry.message,
      entry.details ?? {},
    ],
  );
}