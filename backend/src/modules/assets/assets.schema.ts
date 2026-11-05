import { HttpError } from "../../shared/errors.js";
import type { Reading } from "./assets.types.js";

function nonempty(value: unknown, field: string, max = 100): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new HttpError(400, `${field} must be a nonempty string of at most ${max} characters`);
  }
  return value.trim();
}
export function parseRegistration(body: unknown): { id: string; bleTag: string; name: string } {
  if (!body || typeof body !== "object") throw new HttpError(400, "Invalid request body");
  const b = body as Record<string, unknown>;
  return { id: nonempty(b.id, "id", 50), bleTag: nonempty(b.bleTag, "bleTag", 100), name: nonempty(b.name, "name", 200) };
}
export function parseReading(body: unknown): Reading {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Invalid reading");
  const b = body as Record<string, unknown>;
  if (b.location !== "inside" && b.location !== "outside") throw new HttpError(400, "location must be inside or outside");
  const reading: Reading = { bleTag: nonempty(b.bleTag, "bleTag"), location: b.location };
  if (b.batteryLevel !== undefined) {
    if (typeof b.batteryLevel !== "number" || !Number.isInteger(b.batteryLevel) || b.batteryLevel < 0 || b.batteryLevel > 100) {
      throw new HttpError(400, "batteryLevel must be an integer from 0 to 100");
    }
    reading.batteryLevel = b.batteryLevel;
  }
  if (b.readerId !== undefined) reading.readerId = nonempty(b.readerId, "readerId");
  return reading;
}
export function parseAssetId(value: unknown): string { return nonempty(value, "id", 50); }
