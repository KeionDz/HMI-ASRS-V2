import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("logs", {
    id: "id",

    timestamp: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },

    level: {
      type: "varchar(10)",
      notNull: true,
    },

    category: {
      type: "varchar(20)",
      notNull: true,
    },

    source: {
      type: "text",
      notNull: true,
    },

    actor: {
      type: "text",
      notNull: true,
    },

    pallet_id: {
      type: "text",
    },

    event_id: {
      type: "text",
    },

    message: {
      type: "text",
      notNull: true,
    },

    details: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
  });

  pgm.addConstraint("logs", "logs_level_check", {
    check: "level IN ('debug', 'info', 'warn', 'error')",
  });

  pgm.addConstraint("logs", "logs_category_check", {
    check:
      "category IN ('audit', 'process', 'device', 'ingestion', 'system')",
  });

  pgm.createIndex("logs", "timestamp");
  pgm.createIndex("logs", "level");
  pgm.createIndex("logs", "category");
  pgm.createIndex("logs", "pallet_id");
  pgm.createIndex("logs", "event_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("logs");
}