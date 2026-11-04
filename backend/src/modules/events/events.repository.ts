import type { PoolClient } from "pg";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../shared/errors.js";
import { log } from "../../shared/logger.js";
import {
  validatePalletAssignment,
  validatePalletRemoval,
} from "./events.rules.js";
import type {
  AssignmentEvent,
  AssignmentPallet,
  EventListItem,
  PalletAssignment,
} from "./events.types.js";

export async function findUpcomingEvents(): Promise<EventListItem[]> {
  const result = await pool.query<EventListItem>(`
    SELECT
      e.id,
      e.title,
      TO_CHAR(e.event_date, 'YYYY-MM-DD') AS date,
      TO_CHAR(e.event_time, 'HH24:MI') AS time,
      e.venue,
      e.floor,
      e.guest_count AS guests,
      et.name AS type,
      e.status,
      COALESCE(
        ARRAY_AGG(p.id ORDER BY p.id) FILTER (WHERE p.id IS NOT NULL),
        ARRAY[]::varchar[]
      ) AS pallets
    FROM events e
    LEFT JOIN event_types et ON et.id = e.event_type_id
    LEFT JOIN pallets p ON p.event_id = e.id
    WHERE e.event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14
      AND e.status <> 'completed'
    GROUP BY e.id, et.name
    ORDER BY e.event_date, e.event_time, e.id
  `);

  return result.rows;
}

async function findEventForAssignment(
  client: PoolClient,
  eventId: string,
): Promise<AssignmentEvent> {
  const result = await client.query<AssignmentEvent>(
    `
      SELECT id, status
      FROM events
      WHERE id = $1
      FOR SHARE
    `,
    [eventId],
  );
  const event = result.rows[0];

  if (!event) throw new HttpError(404, "event not found");
  return event;
}

async function findPalletForAssignment(
  client: PoolClient,
  palletId: string,
): Promise<AssignmentPallet> {
  const result = await client.query<AssignmentPallet>(
    `
      SELECT
        id,
        event_id AS "eventId",
        is_locked AS locked
      FROM pallets
      WHERE id = $1
      FOR UPDATE
    `,
    [palletId],
  );
  const pallet = result.rows[0];

  if (!pallet) throw new HttpError(404, "pallet not found");
  return pallet;
}

export async function assignPalletTransaction(
  eventId: string,
  palletId: string,
  actor: string,
): Promise<PalletAssignment> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const event = await findEventForAssignment(client, eventId);
    const pallet = await findPalletForAssignment(client, palletId);

    validatePalletAssignment(event, pallet);

    if (pallet.eventId !== eventId) {
      await client.query(
        `
          UPDATE pallets
          SET event_id = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `,
        [eventId, palletId],
      );

      await log(
        {
          level: "info",
          category: "audit",
          source: "events",
          actor,
          eventId,
          palletId,
          message: "Pallet assigned to event",
          details: { eventId, palletId },
        },
        client,
      );
    }

    await client.query("COMMIT");
    return { palletId, eventId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function removePalletAssignmentTransaction(
  eventId: string,
  palletId: string,
  actor: string,
): Promise<PalletAssignment> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await findEventForAssignment(client, eventId);
    const pallet = await findPalletForAssignment(client, palletId);

    validatePalletRemoval(eventId, pallet);

    if (pallet.eventId !== null) {
      await client.query(
        `
          UPDATE pallets
          SET event_id = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [palletId],
      );

      await log(
        {
          level: "info",
          category: "audit",
          source: "events",
          actor,
          eventId,
          palletId,
          message: "Pallet removed from event",
          details: { eventId, palletId },
        },
        client,
      );
    }

    await client.query("COMMIT");
    return { palletId, eventId: null };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
