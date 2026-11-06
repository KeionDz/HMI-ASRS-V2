import { pool } from "../../db/pool.js";
import { HttpError } from "../../shared/errors.js";
import { log } from "../../shared/logger.js";
import type { Asset, Reading } from "./assets.types.js";

type Row = { id: string; ble_tag: string; name: string; location: Asset["location"]; battery_level: number | null; last_seen_at: Date | null; created_at: Date; updated_at: Date };
function map(row: Row): Asset {
  return { id: row.id, bleTag: row.ble_tag, name: row.name, location: row.location, batteryLevel: row.battery_level,
    lastSeenAt: row.last_seen_at?.toISOString() ?? null, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString() };
}
export async function listAssets(): Promise<Asset[]> {
  const result = await pool.query<Row>("SELECT * FROM tracked_assets ORDER BY id");
  return result.rows.map(map);
}
export async function getAsset(id: string): Promise<Asset> {
  const result = await pool.query<Row>("SELECT * FROM tracked_assets WHERE id=$1", [id]);
  if (!result.rows[0]) throw new HttpError(404, "Asset not found");
  return map(result.rows[0]);
}
export async function registerAsset(input: { id: string; bleTag: string; name: string }): Promise<Asset> {
  try {
    const result = await pool.query<Row>(
      "INSERT INTO tracked_assets(id,ble_tag,name) VALUES($1,$2,$3) RETURNING *",
      [input.id, input.bleTag, input.name],
    );
    return map(result.rows[0]!);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new HttpError(409, "Asset ID or BLE tag already registered");
    throw error;
  }
}
export async function ingestReading(reading: Reading, actor: string): Promise<{ asset: Asset; transition: boolean }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<Row>("SELECT * FROM tracked_assets WHERE ble_tag=$1 FOR UPDATE", [reading.bleTag]);
    const previous = result.rows[0];
    if (!previous) throw new HttpError(404, "BLE tag is not registered");
    const transition = previous.location !== reading.location;
    const batteryChanged =
      reading.batteryLevel !== undefined &&
      reading.batteryLevel !== null &&
      reading.batteryLevel !== previous.battery_level;
    const updated = await client.query<Row>(
      `UPDATE tracked_assets SET location=$2, battery_level=COALESCE($3,battery_level),
       last_seen_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,
      [previous.id, reading.location, reading.batteryLevel ?? null],
    );
    if (transition) {
      await client.query(
        `INSERT INTO asset_tracking_events(asset_id,ble_tag,location,reader_id,battery_level)
         VALUES($1,$2,$3,$4,$5)`,
        [previous.id, reading.bleTag, reading.location, reading.readerId ?? null, reading.batteryLevel ?? null],
      );
      await log({ level: "info", category: "ingestion", source: "assets", actor,
        message: `Asset ${previous.id} reported ${reading.location}`,
        details: { assetId: previous.id, bleTag: reading.bleTag, readerId: reading.readerId ?? null, previousLocation: previous.location } }, client);
    }
    if (batteryChanged) {
     await log(
       {
         level: "info",
         category: "device",
         source: "assets",
         actor,
         message: `Asset ${previous.id} battery level changed`,
         details: {
           assetId: previous.id,
           bleTag: reading.bleTag,
           previousBatteryLevel: previous.battery_level,
           batteryLevel: reading.batteryLevel,
         },
       },
       client,
     );
    }
    await client.query("COMMIT");
    return { asset: map(updated.rows[0]!), transition };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
export async function getAssetEvents(id: string, limit = 100): Promise<unknown[]> {
  await getAsset(id);
  const result = await pool.query(
    `SELECT id, asset_id AS "assetId", ble_tag AS "bleTag", location, reader_id AS "readerId",
     battery_level AS "batteryLevel", occurred_at AS "occurredAt"
     FROM asset_tracking_events WHERE asset_id=$1 ORDER BY occurred_at DESC,id DESC LIMIT $2`,
    [id, limit],
  );
  return result.rows;
}
export async function getAssetSummary(): Promise<{ inside: number; outside: number; unknown: number; total: number }> {
  const result = await pool.query<{ inside: number; outside: number; unknown: number; total: number }>(
    `SELECT COUNT(*) FILTER (WHERE location='inside')::int AS inside,
     COUNT(*) FILTER (WHERE location='outside')::int AS outside,
     COUNT(*) FILTER (WHERE location='unknown')::int AS unknown,
     COUNT(*)::int AS total FROM tracked_assets`,
  );
  return result.rows[0]!;
}
