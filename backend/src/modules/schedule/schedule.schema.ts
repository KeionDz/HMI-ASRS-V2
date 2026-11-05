import { HttpError } from "../../shared/errors.js";
import type { ScheduleInput } from "./schedule.types.js";

export function parseScheduleInput(
  value: unknown,
): ScheduleInput {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new HttpError(400, "Schedule body must be an object");
  }

  const body = value as Record<string, unknown>;

  if (body.kind !== "maintenance" && body.kind !== "dispatch") {
    throw new HttpError(
      400,
      "kind must be maintenance or dispatch",
    );
  }

  const agvId = body.agvId ?? null;

  if (
    agvId !== null &&
    agvId !== "agv-1" &&
    agvId !== "agv-2"
  ) {
    throw new HttpError(400, "Invalid AGV ID");
  }

  let palletId: string | null = null;

  if (body.palletId !== undefined && body.palletId !== null) {
    if (
      typeof body.palletId !== "string" ||
      !body.palletId.trim()
    ) {
      throw new HttpError(400, "palletId must be a non-empty string");
    }

    palletId = body.palletId.trim();
  }

  if (body.kind === "maintenance") {
    if (agvId === null) {
      throw new HttpError(
        400,
        "agvId is required for maintenance",
      );
    }

    if (palletId !== null) {
      throw new HttpError(
        400,
        "Maintenance schedules cannot specify a pallet",
      );
    }
  }

  if (body.kind === "dispatch" && palletId === null) {
    throw new HttpError(
      400,
      "palletId is required for dispatch",
    );
  }

  // Require an explicit timezone to avoid local-time ambiguity.
  if (
    typeof body.scheduledAt !== "string" ||
    !/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(body.scheduledAt)
  ) {
    throw new HttpError(
      400,
      "scheduledAt must include a timezone, such as +08:00 or Z",
    );
  }

  const scheduledTime = Date.parse(body.scheduledAt);

  if (
    !Number.isFinite(scheduledTime) ||
    scheduledTime <= Date.now()
  ) {
    throw new HttpError(
      400,
      "scheduledAt must be a valid future date",
    );
  }

  if (
    body.enabled !== undefined &&
    typeof body.enabled !== "boolean"
  ) {
    throw new HttpError(400, "enabled must be a boolean");
  }

  if (
    typeof body.actor !== "string" ||
    !body.actor.trim()
  ) {
    throw new HttpError(400, "actor is required");
  }

  return {
    kind: body.kind,
    agvId,
    palletId,
    scheduledAt: new Date(scheduledTime).toISOString(),
    enabled: body.enabled ?? false,
    actor: body.actor.trim(),
  };
}