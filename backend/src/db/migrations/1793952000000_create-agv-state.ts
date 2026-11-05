
import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("agv_state", {
    id: {
      type: "text",
      primaryKey: true,
    },
    status: {
      type: "text",
      notNull: true,
      default: "idle",
    },
    battery_level: {
      type: "integer",
      notNull: true,
      default: 100,
    },
    current_pallet_id: {
      type: "varchar(50)",
      references: "pallets",
      onDelete: "RESTRICT",
    },
    destination: {
      type: "text",
    },
    last_heartbeat: {
      type: "timestamptz",
    },
    heartbeat_alert_active: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.addConstraint("agv_state", "agv_status_check", {
    check: "status IN ('idle', 'in_progress', 'charging', 'error')",
  });

  pgm.addConstraint("agv_state", "agv_battery_check", {
    check: "battery_level BETWEEN 0 AND 100",
  });

  pgm.addConstraint("agv_state", "agv_destination_check", {
    check: "destination IS NULL OR length(trim(destination)) > 0",
  });

  pgm.createIndex("agv_state", "current_pallet_id", {
    unique: true,
  });

  pgm.sql(`
    INSERT INTO agv_state (id, status, battery_level)
    VALUES
      ('agv-1', 'idle', 100),
      ('agv-2', 'idle', 100);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("agv_state");
}
