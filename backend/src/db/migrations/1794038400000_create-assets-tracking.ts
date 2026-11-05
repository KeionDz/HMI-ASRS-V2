import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("tracked_assets", {
    id: { type: "text", primaryKey: true },
    ble_tag: { type: "text", notNull: true, unique: true },
    name: { type: "text", notNull: true },
    location: { type: "text", notNull: true, default: "unknown" },
    battery_level: { type: "integer" },
    last_seen_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("CURRENT_TIMESTAMP") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("CURRENT_TIMESTAMP") },
  });
  pgm.addConstraint("tracked_assets", "tracked_assets_location_check", { check: "location IN ('inside','outside','unknown')" });
  pgm.addConstraint("tracked_assets", "tracked_assets_battery_check", { check: "battery_level IS NULL OR battery_level BETWEEN 0 AND 100" });
  pgm.createTable("asset_tracking_events", {
    id: "id",
    asset_id: { type: "text", notNull: true, references: "tracked_assets", onDelete: "CASCADE" },
    ble_tag: { type: "text", notNull: true },
    location: { type: "text", notNull: true },
    reader_id: { type: "text" },
    battery_level: { type: "integer" },
    occurred_at: { type: "timestamptz", notNull: true, default: pgm.func("CURRENT_TIMESTAMP") },
  });
  pgm.addConstraint("asset_tracking_events", "asset_tracking_events_location_check", { check: "location IN ('inside','outside')" });
  pgm.createIndex("asset_tracking_events", ["asset_id", "occurred_at"]);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("asset_tracking_events");
  pgm.dropTable("tracked_assets");
}
