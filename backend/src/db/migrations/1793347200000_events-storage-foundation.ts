import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("events", {
    id: {
      type: "varchar(50)",
      primaryKey: true,
    },
    title: {
      type: "text",
      notNull: true,
    },
    event_date: {
      type: "date",
      notNull: true,
    },
    event_time: {
      type: "time without time zone",
      notNull: true,
    },
    venue: {
      type: "text",
      notNull: true,
    },
    floor: {
      type: "integer",
      notNull: true,
    },
    guest_count: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    event_type_id: {
      type: "integer",
      references: "event_types",
      onDelete: "SET NULL",
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "scheduled",
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

  pgm.addConstraint("events", "events_status_check", {
    check: "status IN ('scheduled', 'completed')",
  });
  pgm.addConstraint("events", "events_floor_check", {
    check: "floor >= 0",
  });
  pgm.addConstraint("events", "events_guest_count_check", {
    check: "guest_count >= 0",
  });
  pgm.createIndex("events", ["event_date", "status"]);
  pgm.createIndex("events", "event_type_id");

  pgm.createTable("pallets", {
    id: {
      type: "varchar(50)",
      primaryKey: true,
    },
    level: {
      type: "integer",
      notNull: true,
    },
    row_number: {
      type: "integer",
      notNull: true,
    },
    slot_number: {
      type: "integer",
      notNull: true,
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "available",
    },
    weight_kg: {
      type: "numeric(10,2)",
      notNull: true,
      default: 0,
    },
    event_id: {
      type: "varchar(50)",
      references: "events",
      onDelete: "SET NULL",
    },
    description: {
      type: "text",
      notNull: true,
      default: "",
    },
    is_locked: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    locked_by: {
      type: "text",
    },
    locked_at: {
      type: "timestamptz",
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

  pgm.addConstraint("pallets", "pallets_location_unique", {
    unique: ["level", "row_number", "slot_number"],
  });
  pgm.addConstraint("pallets", "pallets_location_check", {
    check: "level > 0 AND row_number > 0 AND slot_number > 0",
  });
  pgm.addConstraint("pallets", "pallets_weight_check", {
    check: "weight_kg >= 0",
  });
  pgm.addConstraint("pallets", "pallets_status_check", {
    check: "status IN ('available', 'occupied', 'post-event', 'retrieved')",
  });
  pgm.createIndex("pallets", "event_id");
  pgm.createIndex("pallets", ["level", "status"]);

  pgm.createTable("pallet_contents", {
    pallet_id: {
      type: "varchar(50)",
      notNull: true,
      references: "pallets",
      onDelete: "CASCADE",
    },
    inventory_item_id: {
      type: "integer",
      notNull: true,
      references: "inventory_items",
      onDelete: "RESTRICT",
    },
    quantity: {
      type: "integer",
      notNull: true,
    },
  });

  pgm.addConstraint("pallet_contents", "pallet_contents_primary_key", {
    primaryKey: ["pallet_id", "inventory_item_id"],
  });
  pgm.addConstraint("pallet_contents", "pallet_contents_quantity_check", {
    check: "quantity > 0",
  });
  pgm.createIndex("pallet_contents", "inventory_item_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("pallet_contents");
  pgm.dropTable("pallets");
  pgm.dropTable("events");
}
