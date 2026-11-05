import { HttpError } from "../../shared/errors.js";
import { parseScheduleInput } from "./schedule.schema.js";
import {
  findSchedules,
  findScheduleById,
  createScheduleTransaction,
  updateScheduleTransaction,
  cancelScheduleTransaction,
} from "./schedule.repository.js";

function parseId(value: unknown): number {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/.test(value)
  ) {
    throw new HttpError(400, "Invalid schedule ID");
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id)) {
    throw new HttpError(400, "Invalid schedule ID");
  }

  return id;
}

async function handleWrite<T>(
  action: () => Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23503"
    ) {
      throw new HttpError(
        400,
        "The specified AGV or pallet does not exist",
      );
    }

    throw error;
  }
}

export async function listSchedules() {
  return findSchedules();
}

export async function getSchedule(id: unknown) {
  const schedule = await findScheduleById(parseId(id));

  if (!schedule) {
    throw new HttpError(404, "Schedule not found");
  }

  return schedule;
}

export async function createSchedule(body: unknown) {
  const input = parseScheduleInput(body);

  return handleWrite(() => createScheduleTransaction(input));
}

export async function updateSchedule(
  id: unknown,
  body: unknown,
) {
  const scheduleId = parseId(id);
  const input = parseScheduleInput(body);

  return handleWrite(() =>
    updateScheduleTransaction(scheduleId, input),
  );
}

export async function cancelSchedule(
  id: unknown,
  body: unknown,
) {
  const scheduleId = parseId(id);

  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new HttpError(400, "actor is required");
  }

  const actor = (body as Record<string, unknown>).actor;

  if (typeof actor !== "string" || !actor.trim()) {
    throw new HttpError(400, "actor is required");
  }

  return cancelScheduleTransaction(scheduleId, actor.trim());
}