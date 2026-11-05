import { executeDueSchedules } from "./schedule.executor.js";

let timer: ReturnType<typeof setInterval> | undefined;
let running = false;

async function tick(): Promise<void> {
  if (running) {
    return;
  }

  running = true;

  try {
    await executeDueSchedules();
  } catch (error) {
    console.error("Schedule executor failed:", error);
  } finally {
    running = false;
  }
}

export function startScheduleMonitor(): void {
  if (
    timer !== undefined ||
    process.env.SCHEDULE_EXECUTOR_ENABLED !== "true"
  ) {
    return;
  }

  timer = setInterval(() => {
    void tick();
  }, 5_000);

  timer.unref();
  void tick();
}

export function stopScheduleMonitor(): void {
  if (timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
}