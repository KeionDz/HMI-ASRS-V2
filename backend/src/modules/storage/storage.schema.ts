import { HttpError } from "../../shared/errors.js";
import {
  STORAGE_STATUSES,
  type StorageFilters,
  type StorageStatus,
} from "./storage.types.js";

type QueryParameters = Record<string, unknown>;

function readSingleString(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new HttpError(400, `${name} must be a single string`);
  }
  return value.trim() || undefined;
}

export function parseStorageFilters(query: QueryParameters): StorageFilters {
  const levelText = readSingleString(query.level, "level");
  const statusText = readSingleString(query.status, "status");
  let level: number | undefined;

  if (levelText !== undefined) {
    if (!/^\d+$/.test(levelText) || Number(levelText) < 1) {
      throw new HttpError(400, "level must be a positive integer");
    }
    level = Number(levelText);
  }

  if (
    statusText !== undefined &&
    !STORAGE_STATUSES.includes(statusText as StorageStatus)
  ) {
    throw new HttpError(
      400,
      `status must be one of: ${STORAGE_STATUSES.join(", ")}`,
    );
  }

  return {
    level,
    status: statusText as StorageStatus | undefined,
  };
}

export function parseStorageIdentifier(value: string, name: string): string {
  const identifier = value.trim();

  if (identifier.length === 0 || identifier.length > 50) {
    throw new HttpError(400, `${name} must contain 1 to 50 characters`);
  }

  if (!/^[A-Za-z0-9._-]+$/.test(identifier)) {
    throw new HttpError(
      400,
      `${name} may only contain letters, numbers, dots, underscores, and hyphens`,
    );
  }

  return identifier;
}

export function parseInventoryItemId(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new HttpError(400, "inventoryItemId must be a positive integer");
  }

  const id = Number(value);
  if (id < 1 || id > 2_147_483_647) {
    throw new HttpError(400, "inventoryItemId must be a positive integer");
  }

  return id;
}

export function parsePalletContentQuantity(body: unknown): number {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "request body must be a JSON object");
  }

  const quantity = (body as Record<string, unknown>).quantity;
  if (
    !Number.isInteger(quantity) ||
    (quantity as number) < 1 ||
    (quantity as number) > 2_147_483_647
  ) {
    throw new HttpError(400, "quantity must be a positive integer");
  }

  return quantity as number;
}

export function parseAdminOverride(value: unknown): boolean {
  if (value === undefined || value === "false") return false;
  if (value === "true") return true;

  throw new HttpError(400, "adminOverride must be true or false");
}
