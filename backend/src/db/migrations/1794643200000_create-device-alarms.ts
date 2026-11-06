import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("device_alarms", {
    device_id: {
      type: "text",
      notNull: true,
    },
    code: {
      type: "text",
      notNull: true,
    },
    severity: {
      type: "text",
      notNull: true,
    },
    message: {
      type: "text",
      notNull: true,
    },
    active: {
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

  pgm.addConstraint("device_alarms", "device_alarms_pk", {
    primaryKey: ["device_id", "code"],
  });

  pgm.addConstraint("device_alarms", "device_alarms_device_check", {
    check: "device_id IN ('agv-1', 'agv-2', 'scissor-lift', 'asrs')",
  });

  pgm.addConstraint("device_alarms", "device_alarms_severity_check", {
    check: "severity IN ('warn', 'error')",
  });

  pgm.addConstraint("device_alarms", "device_alarms_code_check", {
    check: "length(trim(code)) BETWEEN 1 AND 100",
  });

  pgm.addConstraint("device_alarms", "device_alarms_message_check", {
    check: "length(trim(message)) BETWEEN 1 AND 500",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("device_alarms");
}