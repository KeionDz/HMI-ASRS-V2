import { pool } from "../../db/pool.js";
import { log } from "../../shared/logger.js";
import type { ImportedEvent } from "./events.csv.js";

export interface EventIngestionStatus {
  fileName: string;
  completedAt: Date;
  importedCount: number;
  skippedCount: number;
  warnings: string[];
}

export async function wasFileImported(fileHash: string): Promise<boolean> {
  const result = await pool.query(
    "SELECT 1 FROM event_ingestion_runs WHERE file_hash = $1 AND status = 'success' LIMIT 1",
    [fileHash],
  );
  return result.rowCount === 1;
}

export async function createIngestionRun(fileName: string, fileHash: string): Promise<number> {
  const result = await pool.query<{ id: number }>(
    "INSERT INTO event_ingestion_runs (file_name, file_hash) VALUES ($1, $2) RETURNING id",
    [fileName, fileHash],
  );
  return result.rows[0]!.id;
}

export async function importEventsTransaction(
  runId: number,
  fileName: string,
  events: ImportedEvent[],
  skippedCount: number,
  warnings: string[],
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const eventTypes = [...new Set(events.map(({ eventType }) => eventType).filter((value): value is string => value !== null))];

    if (eventTypes.length > 0) {
      await client.query(
        `INSERT INTO event_types (name)
         SELECT DISTINCT value FROM unnest($1::text[]) AS value
         ON CONFLICT (name) DO NOTHING`,
        [eventTypes],
      );
    }

    for (const event of events) {
      await client.query(
        `
          INSERT INTO events (
            id, title, event_date, event_time, venue, floor,
            guest_count, event_type_id, status
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            (SELECT id FROM event_types WHERE name = $8),
            'scheduled'
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            event_date = EXCLUDED.event_date,
            event_time = EXCLUDED.event_time,
            venue = EXCLUDED.venue,
            floor = EXCLUDED.floor,
            guest_count = EXCLUDED.guest_count,
            event_type_id = EXCLUDED.event_type_id,
            status = CASE
              WHEN events.status = 'completed' THEN events.status
              ELSE EXCLUDED.status
            END,
            updated_at = CURRENT_TIMESTAMP
        `,
        [event.id, event.title, event.date, event.time, event.venue, event.floor, event.guests, event.eventType],
      );
    }

    await client.query(
      `UPDATE event_ingestion_runs
       SET status = 'success', imported_count = $2, skipped_count = $3,
           warnings = $4, completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [runId, events.length, skippedCount, JSON.stringify(warnings)],
    );
    await log({
      level: warnings.length > 0 ? "warn" : "info",
      category: "ingestion",
      source: "events.csv-ingestion",
      actor: "system",
      message: "Daily event CSV imported",
      details: { fileName, imported: events.length, skipped: skippedCount, warnings },
    }, client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function failIngestionRun(runId: number, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await pool.query(
    `UPDATE event_ingestion_runs
     SET status = 'failed', error = $2, completed_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [runId, message],
  );
  await log({
    level: "error",
    category: "ingestion",
    source: "events.csv-ingestion",
    actor: "system",
    message: "Event CSV import failed",
    details: { runId, error: message },
  });
}

export async function findLastSuccessfulIngestion(): Promise<EventIngestionStatus | null> {
  const result = await pool.query<EventIngestionStatus>(`
    SELECT
      file_name AS "fileName",
      completed_at AS "completedAt",
      imported_count AS "importedCount",
      skipped_count AS "skippedCount",
      warnings
    FROM event_ingestion_runs
    WHERE status = 'success'
    ORDER BY completed_at DESC, id DESC
    LIMIT 1
  `);
  return result.rows[0] ?? null;
}
