import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("process_runs", {
    id: { type: "serial", primaryKey: true },
    mode: { type: "varchar(30)", notNull: true },
    event_id: {
      type: "varchar(50)",
      references: "events",
      onDelete: "SET NULL",
    },
    venue: { type: "text" },
    requested_agv_id: { type: "text" },
    status: { type: "varchar(20)", notNull: true, default: "running" },
    current_pallet_id: { type: "varchar(50)" },
    error_message: { type: "text" },
    actor: { type: "text", notNull: true },
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
    completed_at: { type: "timestamptz" },
  });

  pgm.addConstraint("process_runs", "process_runs_mode_check", {
    check: "mode IN ('retrieve_to_venue', 'retrieve_with_robot', 'store_back')",
  });
  pgm.addConstraint("process_runs", "process_runs_status_check", {
    check: "status IN ('running', 'error', 'stopped', 'completed')",
  });
  pgm.createIndex("process_runs", ["status", "created_at"]);
  pgm.sql(`
    CREATE UNIQUE INDEX process_runs_one_active_idx
    ON process_runs ((1))
    WHERE status IN ('running', 'error');
  `);

  pgm.createTable("process_pallets", {
    id: { type: "serial", primaryKey: true },
    run_id: {
      type: "integer",
      notNull: true,
      references: "process_runs",
      onDelete: "CASCADE",
    },
    pallet_id: {
      type: "varchar(50)",
      notNull: true,
      references: "pallets",
      onDelete: "RESTRICT",
    },
    sequence_index: { type: "integer", notNull: true },
    status: { type: "varchar(20)", notNull: true, default: "pending" },
    current_step: { type: "varchar(40)" },
    original_cell: { type: "text", notNull: true },
    original_level: { type: "integer", notNull: true },
    agv_id: { type: "text" },
    error_message: { type: "text" },
    started_at: { type: "timestamptz" },
    completed_at: { type: "timestamptz" },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.addConstraint("process_pallets", "process_pallets_status_check", {
    check: "status IN ('pending', 'running', 'error', 'stopped', 'completed')",
  });
  pgm.addConstraint("process_pallets", "process_pallets_sequence_check", {
    check: "sequence_index >= 0",
  });
  pgm.addConstraint("process_pallets", "process_pallets_run_pallet_unique", {
    unique: ["run_id", "pallet_id"],
  });
  pgm.addConstraint("process_pallets", "process_pallets_run_sequence_unique", {
    unique: ["run_id", "sequence_index"],
  });
  pgm.createIndex("process_pallets", ["run_id", "sequence_index"]);
  pgm.createIndex("process_pallets", "pallet_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("process_pallets");
  pgm.dropTable("process_runs");
}
