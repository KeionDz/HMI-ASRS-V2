import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("event_types", {
    id: "id",
    name: {
      type: "text",
      notNull: true,
      unique: true,
    },
    description: {
      type: "text",
    },
  });

  pgm.createTable("inventory_items", {
    id: "id",
    name: {
      type: "text",
      notNull: true,
      unique: true,
    },
    description: {
      type: "text",
    },
  });

  pgm.createTable("event_type_items", {
    event_type_id: {
      type: "integer",
      notNull: true,
      references: "event_types",
      onDelete: "CASCADE",
    },
    inventory_item_id: {
      type: "integer",
      notNull: true,
      references: "inventory_items",
      onDelete: "CASCADE",
    },
    default_quantity: {
      type: "integer",
      notNull: true,
      default: 1,
    },
  });

  pgm.addConstraint(
    "event_type_items",
    "event_type_items_primary_key",
    {
      primaryKey: ["event_type_id", "inventory_item_id"],
    },
  );

  pgm.addConstraint(
    "event_type_items",
    "event_type_items_default_quantity_check",
    {
      check: "default_quantity > 0",
    },
  );

  pgm.createIndex("event_type_items", "inventory_item_id");

  pgm.addColumns("admin_settings", {
    storage_level_count: {
      type: "integer",
      notNull: true,
      default: 3,
    },
    pallet_count: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    camera_count: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    asset_tracking_threshold_hours: {
      type: "integer",
      notNull: true,
      default: 6,
    },
  });

  pgm.addConstraint(
    "admin_settings",
    "storage_level_count_check",
    {
      check: "storage_level_count >= 1",
    },
  );

  pgm.addConstraint("admin_settings", "pallet_count_check", {
    check: "pallet_count >= 0",
  });

  pgm.addConstraint("admin_settings", "camera_count_check", {
    check: "camera_count >= 0",
  });

  pgm.addConstraint(
    "admin_settings",
    "asset_tracking_threshold_hours_check",
    {
      check: "asset_tracking_threshold_hours >= 6",
    },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("event_type_items");
  pgm.dropTable("inventory_items");
  pgm.dropTable("event_types");

  pgm.dropColumns("admin_settings", [
    "storage_level_count",
    "pallet_count",
    "camera_count",
    "asset_tracking_threshold_hours",
  ]);
}