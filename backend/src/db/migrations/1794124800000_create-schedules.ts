import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("schedules", {
    id: "id",

    kind: {
      type: "text",
      notNull: true,
    },

    agv_id: {
      type: "text",
      references: "agv_state",
    },

    pallet_id: {
      type: "text",
      references: "pallets",
    },

    scheduled_at: {
      type: "timestamptz",
      notNull: true,
    },

    enabled: {
      type: "boolean",
      notNull: true,
      default: false,
    },

    status: {
      type: "text",
      notNull: true,
      default: "pending",
    },

    actor: {
      type: "text",
      notNull: true,
    },

    result: {
      type: "jsonb",
    },

    executed_at: {
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

  pgm.addConstraint("schedules", "schedules_kind_check", {
    check: "kind IN ('maintenance', 'dispatch')",
  });

  pgm.addConstraint("schedules", "schedules_status_check", {
    check: "status IN ('pending', 'completed', 'failed', 'cancelled')",
  });

  pgm.addConstraint("schedules", "schedules_target_check", {
    check: `
      (
        kind = 'maintenance'
        AND agv_id IS NOT NULL
        AND pallet_id IS NULL
      )
      OR
      (
        kind = 'dispatch'
        AND pallet_id IS NOT NULL
      )
    `,
  });

  pgm.addConstraint("schedules", "schedules_actor_check", {
    check: "length(trim(actor)) > 0",
  });

  pgm.createIndex("schedules", ["scheduled_at", "id"], {
    name: "schedules_due_idx",
    where: "status = 'pending' AND enabled = true",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("schedules");
}