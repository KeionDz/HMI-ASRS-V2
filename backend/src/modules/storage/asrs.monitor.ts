import { checkAsrsHeartbeat } from "./asrs.repository.js";

let timer: ReturnType<typeof setInterval> | undefined;
let checking = false;

async function tick(): Promise<void> {
  if (checking) {
    return;
  }

  checking = true;

  try {
    await checkAsrsHeartbeat();
  } catch (error) {
    console.error("ASRS heartbeat monitor failed:", error);
  } finally {
    checking = false;
  }
}

export function startAsrsMonitor(): void {
  if (timer !== undefined) {
    return;
  }

  timer = setInterval(() => {
    void tick();
  }, 10_000);

  timer.unref();
  void tick();
}

export function stopAsrsMonitor(): void {
  if (timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
}