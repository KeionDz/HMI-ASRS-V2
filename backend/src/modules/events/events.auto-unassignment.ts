import { releaseExpiredPalletAssignments } from "./events.repository.js";
import type { ReleasedPalletAssignment } from "./events.types.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | undefined;
let running = false;

export function getAutoUnassignmentCutoff(now = new Date()): Date {
  return new Date(now.getTime() - ONE_DAY_MS);
}

export async function runEventAutoUnassignment(
  now = new Date(),
): Promise<ReleasedPalletAssignment[]> {
  return releaseExpiredPalletAssignments(
    getAutoUnassignmentCutoff(now),
    "system",
  );
}

async function tick(): Promise<void> {
  if (running) return;

  running = true;
  try {
    await runEventAutoUnassignment();
  } catch (error) {
    console.error("Event auto-unassignment failed:", error);
  } finally {
    running = false;
  }
}

export function startEventAutoUnassignmentJob(): void {
  if (timer !== undefined) return;

  void tick();
  timer = setInterval(() => {
    void tick();
  }, ONE_DAY_MS);
  timer.unref();
}

export function stopEventAutoUnassignmentJob(): void {
  if (timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
}
