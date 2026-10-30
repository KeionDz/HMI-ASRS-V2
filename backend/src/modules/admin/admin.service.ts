import { pool } from "../../db/pool.js";
import { HttpError } from "../../shared/errors.js";
import { log } from "../../shared/logger.js";

export interface NamedAdminRecord {
  id: number;
  name: string;
  description: string | null;
}

export interface EventTypeItem {
  eventTypeId: number;
  inventoryItemId: number;
  name: string;
  description: string | null;
  defaultQuantity: number;
}

export interface AdminSettings {
  logRetentionDays: number;
  storageLevelCount: number;
  palletCount: number;
  cameraCount: number;
  assetTrackingThresholdHours: number;
}

export interface AdminSettingsUpdate {
  logRetentionDays?: number;
  storageLevelCount?: number;
  palletCount?: number;
  cameraCount?: number;
  assetTrackingThresholdHours?: number;
}

interface NamedAdminInput {
  name: string;
  description: string | null;
}

function readBody(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "request body must be a JSON object");
  }

  return body as Record<string, unknown>;
}

export function parseNamedAdminInput(body: unknown): NamedAdminInput {
  const value = readBody(body);

  if (typeof value.name !== "string" || value.name.trim() === "") {
    throw new HttpError(400, "name is required");
  }

  const name = value.name.trim();
  if (name.length > 100) {
    throw new HttpError(400, "name must not exceed 100 characters");
  }

  if (
    value.description !== undefined &&
    value.description !== null &&
    typeof value.description !== "string"
  ) {
    throw new HttpError(400, "description must be a string or null");
  }

  const description =
    typeof value.description === "string"
      ? value.description.trim() || null
      : null;

  if (description && description.length > 500) {
    throw new HttpError(400, "description must not exceed 500 characters");
  }

  return { name, description };
}

function readInteger(
  value: unknown,
  name: string,
  minimum: number,
  maximum?: number,
): number {
  if (!Number.isInteger(value)) {
    throw new HttpError(400, `${name} must be an integer`);
  }

  const number = value as number;
  if (number < minimum || (maximum !== undefined && number > maximum)) {
    const range =
      maximum === undefined
        ? `at least ${minimum}`
        : `between ${minimum} and ${maximum}`;
    throw new HttpError(400, `${name} must be ${range}`);
  }

  return number;
}

export function parseDefaultQuantity(body: unknown): number {
  return readInteger(readBody(body).defaultQuantity, "defaultQuantity", 1);
}

const SETTING_RULES = {
  logRetentionDays: [1, 3650],
  storageLevelCount: [1],
  palletCount: [0],
  cameraCount: [0],
  assetTrackingThresholdHours: [6],
} as const;

export function parseAdminSettingsUpdate(body: unknown): AdminSettingsUpdate {
  const value = readBody(body);
  const allowedKeys = Object.keys(SETTING_RULES);

  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      throw new HttpError(400, `unknown setting: ${key}`);
    }
  }

  if (Object.keys(value).length === 0) {
    throw new HttpError(400, "at least one setting is required");
  }

  const update: AdminSettingsUpdate = {};
  for (const key of allowedKeys as Array<keyof AdminSettingsUpdate>) {
    if (value[key] === undefined) continue;

    const [minimum, maximum] = SETTING_RULES[key];
    update[key] = readInteger(value[key], key, minimum, maximum);
  }

  return update;
}

function isPostgresError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

async function ensureRecordExists(
  table: "event_types" | "inventory_items",
  id: number,
  label: string,
): Promise<void> {
  const result = await pool.query(`SELECT 1 FROM ${table} WHERE id = $1`, [id]);
  if (result.rowCount === 0) {
    throw new HttpError(404, `${label} not found`);
  }
}

export async function listEventTypes(): Promise<NamedAdminRecord[]> {
  const result = await pool.query<NamedAdminRecord>(`
    SELECT id, name, description
    FROM event_types
    ORDER BY name, id
  `);
  return result.rows;
}

export async function createEventType(
  body: unknown,
  actor: string,
): Promise<NamedAdminRecord> {
  const input = parseNamedAdminInput(body);

  try {
    const result = await pool.query<NamedAdminRecord>(
      `
        INSERT INTO event_types (name, description)
        VALUES ($1, $2)
        RETURNING id, name, description
      `,
      [input.name, input.description],
    );
    const eventType = result.rows[0]!;

    await log({
      level: "info",
      category: "audit",
      source: "admin",
      actor,
      message: "Event type created",
      details: { ...eventType },
    });

    return eventType;
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      throw new HttpError(409, "event type name already exists");
    }
    throw error;
  }
}

export async function deleteEventType(
  id: number,
  actor: string,
): Promise<void> {
  const result = await pool.query<NamedAdminRecord>(
    `DELETE FROM event_types WHERE id = $1 RETURNING id, name, description`,
    [id],
  );
  const eventType = result.rows[0];
  if (!eventType) throw new HttpError(404, "event type not found");

  await log({
    level: "info",
    category: "audit",
    source: "admin",
    actor,
    message: "Event type deleted",
    details: { ...eventType },
  });
}

export async function listInventoryItems(): Promise<NamedAdminRecord[]> {
  const result = await pool.query<NamedAdminRecord>(`
    SELECT id, name, description
    FROM inventory_items
    ORDER BY name, id
  `);
  return result.rows;
}

export async function createInventoryItem(
  body: unknown,
  actor: string,
): Promise<NamedAdminRecord> {
  const input = parseNamedAdminInput(body);

  try {
    const result = await pool.query<NamedAdminRecord>(
      `
        INSERT INTO inventory_items (name, description)
        VALUES ($1, $2)
        RETURNING id, name, description
      `,
      [input.name, input.description],
    );
    const item = result.rows[0]!;

    await log({
      level: "info",
      category: "audit",
      source: "admin",
      actor,
      message: "Inventory item created",
      details: { ...item },
    });

    return item;
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      throw new HttpError(409, "inventory item name already exists");
    }
    throw error;
  }
}

export async function deleteInventoryItem(
  id: number,
  actor: string,
): Promise<void> {
  const result = await pool.query<NamedAdminRecord>(
    `DELETE FROM inventory_items WHERE id = $1 RETURNING id, name, description`,
    [id],
  );
  const item = result.rows[0];
  if (!item) throw new HttpError(404, "inventory item not found");

  await log({
    level: "info",
    category: "audit",
    source: "admin",
    actor,
    message: "Inventory item deleted",
    details: { ...item },
  });
}

export async function listEventTypeItems(
  eventTypeId: number,
): Promise<EventTypeItem[]> {
  await ensureRecordExists("event_types", eventTypeId, "event type");
  const result = await pool.query<EventTypeItem>(
    `
      SELECT
        eti.event_type_id AS "eventTypeId",
        ii.id AS "inventoryItemId",
        ii.name,
        ii.description,
        eti.default_quantity AS "defaultQuantity"
      FROM event_type_items eti
      JOIN inventory_items ii ON ii.id = eti.inventory_item_id
      WHERE eti.event_type_id = $1
      ORDER BY ii.name, ii.id
    `,
    [eventTypeId],
  );
  return result.rows;
}

export async function setEventTypeItem(
  eventTypeId: number,
  inventoryItemId: number,
  body: unknown,
  actor: string,
): Promise<{
  eventTypeId: number;
  inventoryItemId: number;
  defaultQuantity: number;
}> {
  const defaultQuantity = parseDefaultQuantity(body);
  await Promise.all([
    ensureRecordExists("event_types", eventTypeId, "event type"),
    ensureRecordExists("inventory_items", inventoryItemId, "inventory item"),
  ]);

  await pool.query(
    `
      INSERT INTO event_type_items (
        event_type_id,
        inventory_item_id,
        default_quantity
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (event_type_id, inventory_item_id)
      DO UPDATE SET default_quantity = EXCLUDED.default_quantity
    `,
    [eventTypeId, inventoryItemId, defaultQuantity],
  );

  const association = { eventTypeId, inventoryItemId, defaultQuantity };
  await log({
    level: "info",
    category: "audit",
    source: "admin",
    actor,
    message: "Event type checklist item saved",
    details: association,
  });

  return association;
}

export async function removeEventTypeItem(
  eventTypeId: number,
  inventoryItemId: number,
  actor: string,
): Promise<void> {
  const result = await pool.query(
    `
      DELETE FROM event_type_items
      WHERE event_type_id = $1 AND inventory_item_id = $2
    `,
    [eventTypeId, inventoryItemId],
  );
  if (result.rowCount === 0) {
    throw new HttpError(404, "event type checklist item not found");
  }

  await log({
    level: "info",
    category: "audit",
    source: "admin",
    actor,
    message: "Event type checklist item removed",
    details: { eventTypeId, inventoryItemId },
  });
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const result = await pool.query<AdminSettings>(`
    SELECT
      log_retention_days AS "logRetentionDays",
      storage_level_count AS "storageLevelCount",
      pallet_count AS "palletCount",
      camera_count AS "cameraCount",
      asset_tracking_threshold_hours AS "assetTrackingThresholdHours"
    FROM admin_settings
    WHERE id = 1
  `);
  const settings = result.rows[0];
  if (!settings) throw new HttpError(500, "admin settings are missing");
  return settings;
}

const SETTING_COLUMNS: Record<keyof AdminSettingsUpdate, string> = {
  logRetentionDays: "log_retention_days",
  storageLevelCount: "storage_level_count",
  palletCount: "pallet_count",
  cameraCount: "camera_count",
  assetTrackingThresholdHours: "asset_tracking_threshold_hours",
};

export async function updateAdminSettings(
  body: unknown,
  actor: string,
): Promise<AdminSettings> {
  const update = parseAdminSettingsUpdate(body);
  const entries = Object.entries(update) as Array<
    [keyof AdminSettingsUpdate, number]
  >;
  const values = entries.map(([, value]) => value);
  const assignments = entries.map(
    ([key], index) => `${SETTING_COLUMNS[key]} = $${index + 1}`,
  );

  const result = await pool.query<AdminSettings>(
    `
      UPDATE admin_settings
      SET ${assignments.join(", ")}
      WHERE id = 1
      RETURNING
        log_retention_days AS "logRetentionDays",
        storage_level_count AS "storageLevelCount",
        pallet_count AS "palletCount",
        camera_count AS "cameraCount",
        asset_tracking_threshold_hours AS "assetTrackingThresholdHours"
    `,
    values,
  );
  const settings = result.rows[0];
  if (!settings) throw new HttpError(500, "admin settings are missing");

  await log({
    level: "info",
    category: "audit",
    source: "admin",
    actor,
    message: "Admin settings updated",
    details: { changed: update, current: settings },
  });

  return settings;
}
