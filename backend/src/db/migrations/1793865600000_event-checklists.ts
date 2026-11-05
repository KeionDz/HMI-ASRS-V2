import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("event_checklist_items", {
    event_id: {
      type: "varchar(50)",
      notNull: true,
      references: "events",
      onDelete: "CASCADE",
    },
    inventory_item_id: {
      type: "integer",
      notNull: true,
      references: "inventory_items",
      onDelete: "RESTRICT",
    },
    required_quantity: {
      type: "integer",
      notNull: true,
    },
    source: {
      type: "varchar(20)",
      notNull: true,
      default: "template",
    },
    is_overridden: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.addConstraint(
    "event_checklist_items",
    "event_checklist_items_primary_key",
    {
      primaryKey: ["event_id", "inventory_item_id"],
    },
  );
  pgm.addConstraint(
    "event_checklist_items",
    "event_checklist_items_quantity_check",
    {
      check: "required_quantity > 0",
    },
  );
  pgm.addConstraint(
    "event_checklist_items",
    "event_checklist_items_source_check",
    {
      check: "source IN ('template', 'event')",
    },
  );
  pgm.createIndex("event_checklist_items", "inventory_item_id");

  pgm.sql(`
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
    ON CONFLICT (event_id, inventory_item_id) DO NOTHING
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("event_checklist_items");
}
