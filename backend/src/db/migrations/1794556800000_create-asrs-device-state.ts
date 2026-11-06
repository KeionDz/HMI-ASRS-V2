import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("asrs_device_state", {
    id: {
      type: "text",
      primaryKey: true,
    },

    last_heartbeat: {
      type: "timestamptz",
    },

    heartbeat_started_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
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

  pgm.addConstraint(
    "asrs_device_state",
    "asrs_device_state_single_device",
    { check: "id = 'asrs'" },
  );

  pgm.sql(`
    INSERT INTO asrs_device_state (id)
    VALUES ('asrs');
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("asrs_device_state");
}