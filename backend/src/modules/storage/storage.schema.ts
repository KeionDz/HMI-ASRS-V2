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
