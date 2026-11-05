import type { PoolClient } from "pg";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../shared/errors.js";
import { log } from "../../shared/logger.js";
import { validatePalletContentEdit } from "./storage.rules.js";
import type {
  PalletContentUpdate,
  StorageFilters,
  StoragePalletState,
  StorageSlot,
} from "./storage.types.js";

export async function findStorageSlots(
  filters: StorageFilters,
): Promise<StorageSlot[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.level !== undefined) {
    values.push(filters.level);
    conditions.push(`p.level = $${values.length}`);
  }

  if (filters.status !== undefined) {
    values.push(filters.status);
    conditions.push(`p.status = $${values.length}`);
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const result = await pool.query<StorageSlot>(
    `
      SELECT
        p.id,
        p.level,
        p.row_number AS row,
        p.slot_number AS slot,
        p.status,
        COALESCE(SUM(pc.quantity), 0)::integer AS items,
        p.weight_kg::float8 AS weight,
        p.event_id AS "eventId",
        p.description,
        p.is_locked AS locked,
        COALESCE(
          JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'inventoryItemId', ii.id,
              'name', ii.name,
              'quantity', pc.quantity
            )
            ORDER BY ii.name
          ) FILTER (WHERE ii.id IS NOT NULL),
          '[]'::jsonb
        ) AS contents
      FROM pallets p
      LEFT JOIN pallet_contents pc ON pc.pallet_id = p.id
      LEFT JOIN inventory_items ii ON ii.id = pc.inventory_item_id
      ${where}
      GROUP BY p.id
      ORDER BY p.level, p.row_number, p.slot_number
    `,
    values,
  );

  return result.rows;
}

async function findPalletForContentUpdate(
  client: PoolClient,
  palletId: string,
): Promise<StoragePalletState> {
  const result = await client.query<StoragePalletState>(
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

async function ensureInventoryItemExists(
  client: PoolClient,
  inventoryItemId: number,
): Promise<void> {
  const result = await client.query(
    "SELECT 1 FROM inventory_items WHERE id = $1",
    [inventoryItemId],
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, "inventory item not found");
  }
}

async function findPalletContent(
  client: PoolClient,
  palletId: string,
  inventoryItemId: number,
): Promise<PalletContentUpdate> {
  const result = await client.query<PalletContentUpdate>(
    `
      SELECT
        pc.pallet_id AS "palletId",
        pc.inventory_item_id AS "inventoryItemId",
        ii.name,
        pc.quantity
      FROM pallet_contents pc
      JOIN inventory_items ii ON ii.id = pc.inventory_item_id
      WHERE pc.pallet_id = $1 AND pc.inventory_item_id = $2
    `,
    [palletId, inventoryItemId],
  );
  const content = result.rows[0];

  if (!content) throw new Error("Pallet content was not saved");
  return content;
}

export async function savePalletContentTransaction(
  palletId: string,
  inventoryItemId: number,
  quantity: number,
  actor: string,
): Promise<PalletContentUpdate> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const pallet = await findPalletForContentUpdate(client, palletId);
    validatePalletContentEdit(pallet);
    await ensureInventoryItemExists(client, inventoryItemId);

    await client.query(
      `
        INSERT INTO pallet_contents (pallet_id, inventory_item_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (pallet_id, inventory_item_id)
        DO UPDATE SET quantity = EXCLUDED.quantity
      `,
      [palletId, inventoryItemId, quantity],
    );

    await log(
      {
        level: "info",
        category: "audit",
        source: "storage",
        actor,
        palletId,
        eventId: pallet.eventId ?? undefined,
        message: "Pallet content saved",
        details: { inventoryItemId, quantity },
      },
      client,
    );

    const content = await findPalletContent(
      client,
      palletId,
      inventoryItemId,
    );
    await client.query("COMMIT");
    return content;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function removePalletContentTransaction(
  palletId: string,
  inventoryItemId: number,
  actor: string,
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const pallet = await findPalletForContentUpdate(client, palletId);
    validatePalletContentEdit(pallet);

    const result = await client.query(
      `
        DELETE FROM pallet_contents
        WHERE pallet_id = $1 AND inventory_item_id = $2
      `,
      [palletId, inventoryItemId],
    );

    if ((result.rowCount ?? 0) > 0) {
      await log(
        {
          level: "info",
          category: "audit",
          source: "storage",
          actor,
          palletId,
          eventId: pallet.eventId ?? undefined,
          message: "Pallet content removed",
          details: { inventoryItemId },
        },
        client,
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
