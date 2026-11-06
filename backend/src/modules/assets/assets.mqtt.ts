import { connect, type MqttClient } from "mqtt";
import { assetsService } from "./assets.service.js";
import { log } from "../../shared/logger.js";
import { attachMqttLogging } from "../../shared/mqtt-monitor.js";

let client: MqttClient | undefined;
export function startAssetsMqtt(): void {
  const url = process.env.ASSETS_MQTT_URL;
  if (!url) {
    console.log("[Assets] MQTT disabled (ASSETS_MQTT_URL not set)");
    return;
  }
  const topic = process.env.ASSETS_MQTT_TOPIC || "asrs/assets/readings";
  client = connect(url, {
    username: process.env.ASSETS_MQTT_USERNAME || undefined,
    password: process.env.ASSETS_MQTT_PASSWORD || undefined,
    reconnectPeriod: 5000,
  });
  const health = attachMqttLogging(client, "assets");
  client.on("connect", () => {
    client?.subscribe(topic, { qos: 1 }, (error, granted) => {
      health.subscription(error, granted);
      if (error) console.error("[Assets] MQTT subscription failed:", error);
      else console.log(`[Assets] Subscribed to ${topic}`);
    });
  });
  client.on("message", (receivedTopic, payload) => {
    if (receivedTopic !== topic) return;
    void (async () => {
      try {
        if (payload.length > 4096) throw new Error("MQTT payload too large");
        await assetsService.ingest(JSON.parse(payload.toString("utf8")) as unknown, "mqtt-reader");
      } catch (error) {
        console.error("[Assets] MQTT reading rejected:", error);

        try {
          await log({
            level: "warn",
            category: "ingestion",
            source: "assets",
            actor: "mqtt-reader",
            message: "MQTT asset reading rejected",
            details: {
              topic: receivedTopic,
              payloadBytes: payload.length,
              reason:
                payload.length > 4096
                  ? "payload_too_large"
                  : error instanceof SyntaxError
                    ? "invalid_json"
                    : "validation_or_processing_failed",
            },
          });
        } catch (loggingError) {
          console.error(
            "[Assets] Failed to log rejected MQTT reading:",
            loggingError,
          );
        }
      }
    })();
  });
  client.on("error", (error) => console.error("[Assets] MQTT connection error:", error));
}
export function stopAssetsMqtt(): void { client?.end(true); client = undefined; }
