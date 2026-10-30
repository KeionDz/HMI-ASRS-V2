import { pool } from "../../db/pool.js";
import type {
  StorageFilters,
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
