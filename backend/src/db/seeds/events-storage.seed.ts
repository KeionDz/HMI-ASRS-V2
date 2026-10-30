import type { PoolClient } from "pg";
import { pool } from "../pool.js";
import { log } from "../../shared/logger.js";

async function seedEventsAndStorage(client: PoolClient): Promise<void> {
  await client.query(`
    INSERT INTO event_types (name, description)
    VALUES
      ('Gala', 'Formal dinner or celebration'),
      ('Corporate', 'Meeting, summit, or product event'),
      ('Wedding', 'Wedding ceremony or reception')
    ON CONFLICT (name) DO UPDATE
    SET description = EXCLUDED.description
  `);

  await client.query(`
    INSERT INTO inventory_items (name, description)
    VALUES
      ('Banquet table', 'Round banquet table'),
      ('Stacking chair', 'Stackable function chair'),
      ('Linen cart', 'Mobile cart for table linen'),
      ('Stage riser', 'Modular stage platform'),
      ('AV equipment', 'Projector and audio equipment')
    ON CONFLICT (name) DO UPDATE
    SET description = EXCLUDED.description
  `);

  await client.query(`
    INSERT INTO events (
      id, title, event_date, event_time, venue, floor,
      guest_count, event_type_id, status
    )
    VALUES
      (
        'EVT-001', 'Grand Ballroom Gala', CURRENT_DATE + 1, '18:00',
        'Ballroom A', 3, 120,
        (SELECT id FROM event_types WHERE name = 'Gala'), 'scheduled'
      ),
      (
        'EVT-002', 'Corporate Summit', CURRENT_DATE + 2, '09:00',
        'Ballroom B', 2, 80,
        (SELECT id FROM event_types WHERE name = 'Corporate'), 'scheduled'
      ),
      (
        'EVT-003', 'Wedding Reception', CURRENT_DATE + 4, '16:00',
        'Ballroom A', 3, 150,
        (SELECT id FROM event_types WHERE name = 'Wedding'), 'scheduled'
      ),
      (
        'EVT-004', 'Product Launch', CURRENT_DATE + 7, '14:00',
        'Ballroom B', 2, 60,
        (SELECT id FROM event_types WHERE name = 'Corporate'), 'scheduled'
      ),
      (
        'EVT-000', 'Completed Board Retreat', CURRENT_DATE, '14:00',
        'Ballroom A', 3, 40,
        (SELECT id FROM event_types WHERE name = 'Corporate'), 'completed'
      )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      event_date = EXCLUDED.event_date,
      event_time = EXCLUDED.event_time,
      venue = EXCLUDED.venue,
      floor = EXCLUDED.floor,
      guest_count = EXCLUDED.guest_count,
      event_type_id = EXCLUDED.event_type_id,
      status = EXCLUDED.status,
      updated_at = CURRENT_TIMESTAMP
  `);

  await client.query(`
    INSERT INTO pallets (
      id, level, row_number, slot_number, status,
      weight_kg, event_id, description
    )
    VALUES
      ('L1-R1-S1', 1, 1, 1, 'occupied', 183, 'EVT-001', 'Gala furniture'),
      ('L1-R1-S2', 1, 1, 2, 'occupied', 148, 'EVT-001', 'Gala chairs and linen'),
      ('L1-R2-S1', 1, 2, 1, 'occupied', 122, 'EVT-002', 'Corporate equipment'),
      ('L1-R2-S2', 1, 2, 2, 'available', 0, NULL, ''),
      ('L2-R1-S1', 2, 1, 1, 'occupied', 221, 'EVT-003', 'Wedding furniture'),
      ('L2-R1-S2', 2, 1, 2, 'available', 0, NULL, ''),
      ('L3-R1-S1', 3, 1, 1, 'occupied', 315, 'EVT-004', 'Launch equipment'),
      ('L3-R1-S2', 3, 1, 2, 'available', 0, NULL, '')
    ON CONFLICT (id) DO UPDATE SET
      level = EXCLUDED.level,
      row_number = EXCLUDED.row_number,
      slot_number = EXCLUDED.slot_number,
      status = EXCLUDED.status,
      weight_kg = EXCLUDED.weight_kg,
      event_id = EXCLUDED.event_id,
      description = EXCLUDED.description,
      updated_at = CURRENT_TIMESTAMP
  `);

  await client.query(`
    INSERT INTO pallet_contents (pallet_id, inventory_item_id, quantity)
    VALUES
      ('L1-R1-S1', (SELECT id FROM inventory_items WHERE name = 'Banquet table'), 8),
      ('L1-R1-S1', (SELECT id FROM inventory_items WHERE name = 'Stacking chair'), 16),
      ('L1-R1-S2', (SELECT id FROM inventory_items WHERE name = 'Stacking chair'), 16),
      ('L1-R1-S2', (SELECT id FROM inventory_items WHERE name = 'Linen cart'), 2),
      ('L1-R2-S1', (SELECT id FROM inventory_items WHERE name = 'AV equipment'), 4),
      ('L1-R2-S1', (SELECT id FROM inventory_items WHERE name = 'Stacking chair'), 10),
      ('L2-R1-S1', (SELECT id FROM inventory_items WHERE name = 'Stage riser'), 4),
      ('L2-R1-S1', (SELECT id FROM inventory_items WHERE name = 'Stacking chair'), 16),
      ('L3-R1-S1', (SELECT id FROM inventory_items WHERE name = 'AV equipment'), 10),
      ('L3-R1-S1', (SELECT id FROM inventory_items WHERE name = 'Banquet table'), 20)
    ON CONFLICT (pallet_id, inventory_item_id) DO UPDATE
    SET quantity = EXCLUDED.quantity
  `);

  await log(
    {
      level: "info",
      category: "system",
      source: "seed:events-storage",
      actor: "system",
      message: "Events and storage sample data seeded",
      details: { events: 5, pallets: 8 },
    },
    client,
  );
}

async function main(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await seedEventsAndStorage(client);
    await client.query("COMMIT");
    console.log("Events and storage sample data seeded");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error("Failed to seed events and storage:", error);
  process.exitCode = 1;
});
