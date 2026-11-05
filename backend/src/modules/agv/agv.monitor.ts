
import { monitorAgvHeartbeats } from "./agv.service.js";

let monitor: ReturnType<typeof setInterval> | null = null;

export function startAgvMonitor(): void {
  if (monitor) return;

  monitor = setInterval(() => {
    void monitorAgvHeartbeats().catch((error: unknown) => {
      console.error("[AGV] Heartbeat monitor failed:", error);
    });
  }, 10_000);

  monitor.unref?.();

  console.log("[AGV] Heartbeat monitor started");
}

export function stopAgvMonitor(): void {
  if (monitor) {
    clearInterval(monitor);
    monitor = null;
  }
}
