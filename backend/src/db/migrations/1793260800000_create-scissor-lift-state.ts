
import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("scissor_lift_state", {
    id: {
      type: "text",
      primaryKey: true,
    },
    position: {
      type: "text",
      notNull: true,
      default: "lower",
    },
    status: {
      type: "text",
      notNull: true,
      default: "idle",
    },
    emergency_stopped: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    last_heartbeat: {
      type: "timestamptz",
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.sql(`
    INSERT INTO scissor_lift_state (id)
    VALUES ('lift-1');
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("scissor_lift_state");
}
