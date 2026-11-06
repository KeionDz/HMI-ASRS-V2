import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns("agv_state", {
    reserved_process_run_id: {
      type: "integer",
      references: "process_runs",
      onDelete: "RESTRICT",
    },
  });

  pgm.createIndex("agv_state", "reserved_process_run_id", {
    name: "agv_state_process_reservation_idx",
    where: "reserved_process_run_id IS NOT NULL",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex("agv_state", "reserved_process_run_id", {
    name: "agv_state_process_reservation_idx",
  });

  pgm.dropColumns("agv_state", ["reserved_process_run_id"]);
}