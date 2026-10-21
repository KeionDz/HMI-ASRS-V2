import { pool } from "../pool.js";
import { log, type LogInput } from "../../shared/logger.js";

const samples: LogInput[] = [
  {
    level: "debug",
    category: "system",
    source: "seed:system",
    actor: "system",
    message: "Heartbeat diagnostic completed",
    details: { durationMs: 18, servicesChecked: 3 },
  },
  {
    level: "info",
    category: "audit",
    source: "seed:events",
    actor: "operator",
    eventId: "EVT-1001",
    palletId: "PAL-001",
    message: "Pallet assigned to event",
    details: { ballroom: "Ballroom A" },
  },
  {
    level: "warn",
    category: "device",
    source: "seed:assets",
    actor: "system",
    message: "Asset battery below warning threshold",
    details: { assetId: "CHAIR-042", batteryPercent: 18 },
  },
  {
    level: "error",
    category: "process",
    source: "seed:process",
    actor: "system",
    palletId: "PAL-004",
    message: "Pallet retrieval failed",
    details: {
      step: "agv-dispatch",
      reason: "No available robot",
      attemptedRobots: ["AGV-01", "AGV-02"],
    },
  },
  {
    level: "info",
    category: "ingestion",
    source: "seed:csv-ingestion",
    actor: "system",
    message: "Daily event CSV imported",
    details: { file: "events-2026-10-21.csv", imported: 12, skipped: 1 },
  },
];

async function seedLogs(): Promise<void> {
  await pool.query("DELETE FROM logs WHERE source LIKE 'seed:%'");

  for (const sample of samples) {
    await log(sample);
  }

  console.log(`Inserted ${samples.length} sample logs`);
}

async function main(): Promise<void> {
  try {
    await seedLogs();
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error("Failed to seed logs:", error);
  process.exitCode = 1;
});
