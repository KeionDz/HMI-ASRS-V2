import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("admin_settings", {
    id: {
      type: "smallint",
      primaryKey: true,
    },
    log_retention_days: {
      type: "integer",
      notNull: true,
      default: 90,
    },
  });

  pgm.addConstraint("admin_settings", "admin_settings_single_row_check", {
    check: "id = 1",
  });
  pgm.addConstraint("admin_settings", "log_retention_days_check", {
    check: "log_retention_days BETWEEN 1 AND 3650",
  });
  pgm.sql(`
    INSERT INTO admin_settings (id, log_retention_days)
    VALUES (1, 90)
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("admin_settings");
}
