import type { PoolClient } from "pg";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../shared/errors.js";
import { log } from "../../shared/logger.js";
import {
  validateChecklistEdit,
  validatePalletAssignment,
  validatePalletRemoval,
} from "./events.rules.js";
import type {
  AssignmentEvent,
  AssignmentPallet,
  ChecklistInventoryItem,
  ChecklistSource,
  EventChecklistItem,
  EventListItem,
  PalletAssignment,
  ReleasedPalletAssignment,
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

export async function releaseExpiredPalletAssignments(
  cutoff: Date,
  actor: string,
): Promise<ReleasedPalletAssignment[]> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query<ReleasedPalletAssignment>(
      `
        SELECT
          p.id AS "palletId",
          p.event_id AS "eventId"
        FROM pallets p
        JOIN events e ON e.id = p.event_id
        WHERE e.event_date + e.event_time <= (
          $1::timestamptz AT TIME ZONE current_setting('TIMEZONE')
        )
        ORDER BY p.id
        FOR UPDATE OF p SKIP LOCKED
      `,
      [cutoff],
    );

    if (result.rows.length > 0) {
      await client.query(
        `
          UPDATE pallets
          SET event_id = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::varchar[])
        `,
        [result.rows.map(({ palletId }) => palletId)],
      );
    }

    for (const assignment of result.rows) {
      await log(
        {
          level: "info",
          category: "audit",
          source: "events.auto-unassignment",
          actor,
          eventId: assignment.eventId,
          palletId: assignment.palletId,
          message: "Pallet automatically unassigned after event",
          details: { cutoff: cutoff.toISOString() },
        },
        client,
      );
    }

    await log(
      {
        level: "info",
        category: "system",
        source: "events.auto-unassignment",
        actor,
        message: "Event pallet auto-unassignment completed",
        details: {
          cutoff: cutoff.toISOString(),
          releasedCount: result.rows.length,
        },
      },
      client,
    );

    await client.query("COMMIT");
    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function addMissingTemplateChecklistItems(
  client: PoolClient,
  eventId: string,
): Promise<void> {
  await client.query(
    `
      INSERT INTO event_checklist_items (
        event_id,
        inventory_item_id,
        required_quantity,
        source
      )
      SELECT
        e.id,
        eti.inventory_item_id,
        eti.default_quantity,
        'template'
      FROM events e
      JOIN event_type_items eti ON eti.event_type_id = e.event_type_id
      WHERE e.id = $1
      ON CONFLICT (event_id, inventory_item_id) DO NOTHING
    `,
    [eventId],
  );
}

async function findChecklistItems(
  client: PoolClient,
  eventId: string,
  inventoryItemId?: number,
): Promise<EventChecklistItem[]> {
  const values: unknown[] = [eventId];
  const itemFilter = inventoryItemId === undefined
    ? ""
    : `AND eci.inventory_item_id = $${values.push(inventoryItemId)}`;

  const result = await client.query<EventChecklistItem>(
    `
      SELECT
        eci.inventory_item_id AS "inventoryItemId",
        ii.name,
        eci.required_quantity AS "requiredQuantity",
        COALESCE(SUM(pc.quantity), 0)::integer AS "palletQuantity",
        GREATEST(
          eci.required_quantity - COALESCE(SUM(pc.quantity), 0),
          0
        )::integer AS "remainingQuantity",
        eci.source,
        eci.is_overridden AS overridden
      FROM event_checklist_items eci
      JOIN inventory_items ii ON ii.id = eci.inventory_item_id
      LEFT JOIN pallets p ON p.event_id = eci.event_id
      LEFT JOIN pallet_contents pc
        ON pc.pallet_id = p.id
        AND pc.inventory_item_id = eci.inventory_item_id
      WHERE eci.event_id = $1
        ${itemFilter}
      GROUP BY eci.event_id, eci.inventory_item_id, ii.name
      ORDER BY ii.name, eci.inventory_item_id
    `,
    values,
  );

  return result.rows;
}

export async function findEventChecklist(
  eventId: string,
): Promise<EventChecklistItem[]> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await findEventForAssignment(client, eventId);
    await addMissingTemplateChecklistItems(client, eventId);
    const items = await findChecklistItems(client, eventId);
    await client.query("COMMIT");
    return items;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function findChecklistInventoryItem(
  client: PoolClient,
  eventId: string,
  inventoryItemId: number,
): Promise<ChecklistInventoryItem> {
  const result = await client.query<ChecklistInventoryItem>(
    `
      SELECT
        ii.id,
        EXISTS (
          SELECT 1
          FROM events e
          JOIN event_type_items eti ON eti.event_type_id = e.event_type_id
          WHERE e.id = $1
            AND eti.inventory_item_id = ii.id
        ) AS "templateItem",
        (
          SELECT eti.default_quantity
          FROM events e
          JOIN event_type_items eti ON eti.event_type_id = e.event_type_id
          WHERE e.id = $1
            AND eti.inventory_item_id = ii.id
        ) AS "defaultQuantity"
      FROM inventory_items ii
      WHERE ii.id = $2
    `,
    [eventId, inventoryItemId],
  );
  const item = result.rows[0];

  if (!item) throw new HttpError(404, "inventory item not found");
  return item;
}

export async function saveChecklistItemTransaction(
  eventId: string,
  inventoryItemId: number,
  requiredQuantity: number,
  actor: string,
): Promise<EventChecklistItem> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const event = await findEventForAssignment(client, eventId);
    validateChecklistEdit(event);
    const inventoryItem = await findChecklistInventoryItem(
      client,
      eventId,
      inventoryItemId,
    );
    const source: ChecklistSource = inventoryItem.templateItem
      ? "template"
      : "event";

    await client.query(
      `
        INSERT INTO event_checklist_items (
          event_id,
          inventory_item_id,
          required_quantity,
          source,
          is_overridden
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (event_id, inventory_item_id)
        DO UPDATE SET
          required_quantity = EXCLUDED.required_quantity,
          is_overridden = EXCLUDED.is_overridden,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        eventId,
        inventoryItemId,
        requiredQuantity,
        source,
        inventoryItem.templateItem &&
          requiredQuantity !== inventoryItem.defaultQuantity,
      ],
    );

    await log(
      {
        level: "info",
        category: "audit",
        source: "events",
        actor,
        eventId,
        message: "Event checklist item saved",
        details: { inventoryItemId, requiredQuantity, source },
      },
      client,
    );

    const item = (await findChecklistItems(
      client,
      eventId,
      inventoryItemId,
    ))[0];
    if (!item) throw new Error("Checklist item was not saved");

    await client.query("COMMIT");
    return item;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function removeChecklistItemTransaction(
  eventId: string,
  inventoryItemId: number,
  actor: string,
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const event = await findEventForAssignment(client, eventId);
    validateChecklistEdit(event);

    const result = await client.query<{ source: ChecklistSource }>(
      `
        SELECT source
        FROM event_checklist_items
        WHERE event_id = $1 AND inventory_item_id = $2
        FOR UPDATE
      `,
      [eventId, inventoryItemId],
    );
    const item = result.rows[0];

    if (!item) throw new HttpError(404, "checklist item not found");
    if (item.source === "template") {
      throw new HttpError(409, "template checklist items cannot be removed");
    }

    await client.query(
      `
        DELETE FROM event_checklist_items
        WHERE event_id = $1 AND inventory_item_id = $2
      `,
      [eventId, inventoryItemId],
    );

    await log(
      {
        level: "info",
        category: "audit",
        source: "events",
        actor,
        eventId,
        message: "Event checklist item removed",
        details: { inventoryItemId },
      },
      client,
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
