import type { MqttClient } from "mqtt";
import { log } from "./logger.js";

export function attachMqttLogging(
  client: MqttClient,
  source: string,
) {
  const failed = new Set<string>();
  let pending: Promise<void> = Promise.resolve();

  function transition(
    area: "connection" | "subscription",
    failure: boolean,
    reason?: string,
  ): void {
    const wasFailed = failed.has(area);

    if (failure === wasFailed) {
      return;
    }

    if (failure) {
      failed.add(area);
    } else {
      failed.delete(area);
    }

    pending = pending
      .then(() =>
        log({
          level: failure ? "error" : "info",
          category: "system",
          source,
          actor: "system",
          message: `MQTT ${area} ${failure ? "failed" : "restored"}`,
          details: {
            area,
            ...(failure ? { reason } : {}),
          },
        }),
      )
      .catch((error: unknown) => {
        console.error(`[${source}] MQTT health logging failed:`, error);
      });
  }

  client.on("error", () => {
    if (!client.disconnecting) {
      transition("connection", true, "connection_error");
    }
  });

  client.on("close", () => {
    if (!client.disconnecting) {
      transition("connection", true, "connection_closed");
    }
  });

  client.on("connect", () => {
    transition("connection", false);
  });

  return {
    subscription(
      error: Error | null | undefined,
      granted: readonly { qos: number }[] | undefined,
    ): void {
      const rejected =
        Boolean(error) ||
        !granted?.length ||
        granted.some((grant) => grant.qos >= 128);

      transition(
        "subscription",
        rejected,
        rejected ? "subscription_rejected" : undefined,
      );
    },
  };
}