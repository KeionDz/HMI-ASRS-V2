import { connect, type MqttClient } from "mqtt";
import { log } from "../../shared/logger.js";
import { attachMqttLogging } from "../../shared/mqtt-monitor.js";
import { receiveAsrsHeartbeat } from "./asrs.repository.js";

const TOPIC = "asrs/devices/asrs/heartbeat";

let client: MqttClient | undefined;

export function startAsrsMqtt(): void {
  if (client) {
    return;
  }

  // Reuse the broker connection configured for Assets.
  const url = process.env.ASSETS_MQTT_URL;

  if (!url) {
    console.log("[ASRS] MQTT disabled: broker URL not configured");
    return;
  }

  client = connect(url, {
    username: process.env.ASSETS_MQTT_USERNAME || undefined,
    password: process.env.ASSETS_MQTT_PASSWORD || undefined,
    reconnectPeriod: 5_000,
  });
  const health = attachMqttLogging(client, "asrs");

  client.on("connect", () => {
    client?.subscribe(TOPIC, { qos: 1 }, (error, granted) => {
      health.subscription(error, granted);
      if (error) {
        console.error("[ASRS] Subscription failed:", error);
      } else {
        console.log(`[ASRS] Subscribed to ${TOPIC}`);
      }
    });
  });

  client.on("message", (topic, payload, packet) => {
    if (topic !== TOPIC) {
      return;
    }

    void (async () => {
      try {
        // A stored heartbeat must not make an offline device look live.
        if (packet.retain) {
          throw new Error("Retained heartbeats are not accepted");
        }

        if (payload.length > 1_024) {
          throw new Error("Heartbeat payload too large");
        }

        const body: unknown = JSON.parse(payload.toString("utf8"));

        if (
          body === null ||
          typeof body !== "object" ||
          Array.isArray(body) ||
          !("deviceId" in body) ||
          body.deviceId !== "asrs" ||
          !("type" in body) ||
          body.type !== "heartbeat"
        ) {
          throw new Error("Invalid ASRS heartbeat");
        }

        await receiveAsrsHeartbeat();
      } catch (error) {
        console.error("[ASRS] Heartbeat rejected:", error);

        try {
          await log({
            level: "warn",
            category: "ingestion",
            source: "asrs",
            actor: "mqtt",
            message: "ASRS MQTT heartbeat rejected",
            details: {
              topic,
              payloadBytes: payload.length,
              retained: packet.retain,
            },
          });
        } catch (loggingError) {
          console.error("[ASRS] Rejection logging failed:", loggingError);
        }
      }
    })();
  });

  client.on("error", (error) => {
    console.error("[ASRS] MQTT connection error:", error);
  });
}

export function stopAsrsMqtt(): void {
  client?.end(true);
  client = undefined;
}