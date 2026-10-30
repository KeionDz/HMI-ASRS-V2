
import { checkLiftHeartbeat } from "./scissor-lift.service.js";

const CHECK_INTERVAL_MS = 10_000;

let monitor: ReturnType<typeof setInterval> | null = null;
let checking = false;

export function startScissorLiftMonitor(): void {
  if (monitor) {
    return;
  }

  console.log("Scissor Lift heartbeat monitor started");

  monitor = setInterval(async () => {
    if (checking) {
      return;
    }

    checking = true;

    try {
      await checkLiftHeartbeat();
    } catch (error) {
      console.error(
        "Scissor Lift heartbeat monitor failed:",
        error,
      );
    } finally {
      checking = false;
    }
  }, CHECK_INTERVAL_MS);
}

export function stopScissorLiftMonitor(): void {
  if (monitor) {
    clearInterval(monitor);
    monitor = null;
  }
}
