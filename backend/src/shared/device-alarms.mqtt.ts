import { connect, type MqttClient } from "mqtt";
import { ingestDeviceAlarm } from "./device-alarms.js";
import { log } from "./logger.js";
import { attachMqttLogging } from "./mqtt-monitor.js";

const TOPIC = "asrs/devices/+/alarms";
const DEVICES = new Set([
  "agv-1",
  "agv-2",
  "scissor-lift",
  "asrs",
]);

let client: MqttClient | undefined;

// Process messages in arrival order within this subscriber.
let pending: Promise<void> = Promise.resolve();
let queued = 0;
const MAX_QUEUED = 100;

async function rejectMessage(
  topic: string,
  payloadBytes: number,
  reason: string,
): Promise<void> {
  try {
    await log({
      level: "warn",
      category: "ingestion",
      source: "device-alarms",
      actor: "mqtt",
      message: "MQTT device alarm rejected",
      details: { topic, payloadBytes, reason },
    });
  } catch (error) {
    console.error("[Device alarms] Rejection logging failed:", error);
  }
}

export function startDeviceAlarmsMqtt(): void {
  if (client) {
    return;
  }

  const url = process.env.ASSETS_MQTT_URL;

  if (!url) {
    console.log("[Device alarms] MQTT disabled: broker URL not configured");
    return;
  }

  client = connect(url, {
    username: process.env.ASSETS_MQTT_USERNAME || undefined,
    password: process.env.ASSETS_MQTT_PASSWORD || undefined,
    reconnectPeriod: 5_000,
  });
  const health = attachMqttLogging(client, "device-alarms");

  client.on("connect", () => {
    client?.subscribe(TOPIC, { qos: 1 }, (error, granted) => {
      health.subscription(error, granted);
      if (error) {
        console.error("[Device alarms] Subscription failed:", error);
      } else {
        console.log(`[Device alarms] Subscribed to ${TOPIC}`);
      }
    });
  });

  client.on("message", (topic, payload, packet) => {
    if (queued >= MAX_QUEUED) {
      console.error("[Device alarms] Queue full; message not processed");
      return;
    }

    queued += 1;

    pending = pending
      .then(async () => {
        const match = /^asrs\/devices\/([^/]+)\/alarms$/.exec(topic);
        const deviceId = match?.[1];

        if (!deviceId || !DEVICES.has(deviceId)) {
          await rejectMessage(topic, payload.length, "unknown_device");
          return;
        }

        if (packet.retain) {
          await rejectMessage(topic, payload.length, "retained_message");
          return;
        }

        if (payload.length > 4_096) {
          await rejectMessage(topic, payload.length, "payload_too_large");
          return;
        }

        let body: unknown;

        try {
          body = JSON.parse(payload.toString("utf8"));
        } catch {
          await rejectMessage(topic, payload.length, "invalid_json");
          return;
        }

        if (
          body === null ||
          typeof body !== "object" ||
          Array.isArray(body) ||
          !("deviceId" in body) ||
          body.deviceId !== deviceId
        ) {
          await rejectMessage(topic, payload.length, "device_mismatch");
          return;
        }

        await ingestDeviceAlarm(body);
      })
      .catch(async (error: unknown) => {
        console.error("[Device alarms] Processing failed:", error);

        await rejectMessage(
          topic,
          payload.length,
          "validation_or_processing_failed",
        );
      })
      .finally(() => {
        queued -= 1;
      });
  });

  client.on("error", (error) => {
    console.error("[Device alarms] MQTT connection error:", error);
  });
}

export function stopDeviceAlarmsMqtt(): void {
  client?.end(true);
  client = undefined;
}