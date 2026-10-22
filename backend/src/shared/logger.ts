import { pool } from "../db/pool.js";

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export const LOG_CATEGORIES = [
  "audit",
  "process",
  "device",
  "ingestion",
  "system",
] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];
export type LogCategory = (typeof LOG_CATEGORIES)[number];

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
