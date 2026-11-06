import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("event_ingestion_runs", {
    id: "id",
    file_name: { type: "text", notNull: true },
    file_hash: { type: "varchar(64)", notNull: true },
    status: { type: "varchar(20)", notNull: true, default: "running" },
    imported_count: { type: "integer", notNull: true, default: 0 },
    skipped_count: { type: "integer", notNull: true, default: 0 },
    warnings: { type: "jsonb", notNull: true, default: pgm.func("'[]'::jsonb") },
    error: { type: "text" },
    started_at: { type: "timestamptz", notNull: true, default: pgm.func("CURRENT_TIMESTAMP") },
    completed_at: { type: "timestamptz" },
  });

  pgm.addConstraint("event_ingestion_runs", "event_ingestion_status_check", {
    check: "status IN ('running', 'success', 'failed')",
  });
  pgm.createIndex("event_ingestion_runs", "file_hash", {
    name: "event_ingestion_success_hash_idx",
    unique: true,
    where: "status = 'success'",
  });
  pgm.createIndex("event_ingestion_runs", ["status", "completed_at"], {
    name: "event_ingestion_status_completed_idx",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("event_ingestion_runs");
}
