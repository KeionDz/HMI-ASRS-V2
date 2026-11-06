import { HttpError } from "../../shared/errors.js";
import {
  PROCESS_MODES,
  type CreateProcessRunInput,
  type ProcessErrorInput,
} from "./process.types.js";

function readActor(value: unknown): string {
  if (value === undefined) return "operator";
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, "actor must be a non-empty string");
  }
  return value.trim();
}

function readOptionalString(value: unknown, name: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${name} must be a non-empty string`);
  }
  return value.trim();
}

export function parseProcessRunId(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value) || Number(value) < 1) {
    throw new HttpError(400, "runId must be a positive integer");
  }
  return Number(value);
}

export function parseProcessPalletId(value: string | undefined): string {
  if (!value || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,49}$/.test(value)) {
    throw new HttpError(400, "palletId has an invalid format");
  }
  return value;
}

export function parseCreateProcessRun(value: unknown): CreateProcessRunInput {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "Process body must be an object");
  }

  const body = value as Record<string, unknown>;
  if (!PROCESS_MODES.includes(body.mode as never)) {
    throw new HttpError(400, `mode must be one of: ${PROCESS_MODES.join(", ")}`);
  }

  if (!Array.isArray(body.palletIds) || body.palletIds.length === 0) {
    throw new HttpError(400, "palletIds must contain at least one pallet");
  }
  if (body.palletIds.length > 50) {
    throw new HttpError(400, "palletIds cannot contain more than 50 pallets");
  }

  const palletIds = body.palletIds.map((id) => {
    if (typeof id !== "string") {
      throw new HttpError(400, "Every palletId must be a string");
    }
    return parseProcessPalletId(id);
  });
  if (new Set(palletIds).size !== palletIds.length) {
    throw new HttpError(400, "palletIds must not contain duplicates");
  }

  const mode = body.mode as CreateProcessRunInput["mode"];
  const venue = readOptionalString(body.venue, "venue");
  if (mode === "retrieve_to_venue" && venue === null) {
    throw new HttpError(400, "venue is required for retrieve_to_venue");
  }

  const requestedAgvId = readOptionalString(body.agvId, "agvId");
  if (requestedAgvId !== null && !["agv-1", "agv-2"].includes(requestedAgvId)) {
    throw new HttpError(400, "agvId must be agv-1 or agv-2");
  }

  return {
    mode,
    eventId: readOptionalString(body.eventId, "eventId"),
    venue,
    requestedAgvId,
    palletIds,
    actor: readActor(body.actor),
  };
}

export function parseProcessError(value: unknown): ProcessErrorInput {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "Error body must be an object");
  }
  const body = value as Record<string, unknown>;
  if (typeof body.message !== "string" || !body.message.trim()) {
    throw new HttpError(400, "message is required");
  }
  if (body.message.trim().length > 500) {
    throw new HttpError(400, "message cannot exceed 500 characters");
  }
  return { message: body.message.trim(), actor: readActor(body.actor) };
}

export function parseProcessActor(value: unknown): string {
  if (value === undefined) return "operator";
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "Request body must be an object");
  }
  return readActor((value as Record<string, unknown>).actor);
}
