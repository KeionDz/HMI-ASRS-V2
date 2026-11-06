import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseBookingEventsCsv } from "./events.csv.js";
import {
  createIngestionRun,
  failIngestionRun,
  findLastSuccessfulIngestion,
  importEventsTransaction,
  wasFileImported,
} from "./events.ingestion.repository.js";

const SCAN_INTERVAL_MS = 5 * 60 * 1000;
const FILE_SETTLE_MS = 60 * 1000;
const DEFAULT_INBOX = fileURLToPath(new URL("../../../../data/event-inbox/", import.meta.url));

let timer: ReturnType<typeof setInterval> | undefined;
let running = false;

export const eventCsvInbox = process.env.EVENT_CSV_INBOX?.trim() || DEFAULT_INBOX;

async function archiveFile(filePath: string, folder: "processed" | "failed"): Promise<void> {
  const destinationFolder = join(eventCsvInbox, folder);
  await mkdir(destinationFolder, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await rename(filePath, join(destinationFolder, `${stamp}-${basename(filePath)}`));
}

async function ingestFile(filePath: string): Promise<void> {
  const fileName = basename(filePath);
  const bytes = await readFile(filePath);
  const fileHash = createHash("sha256").update(bytes).digest("hex");

  if (await wasFileImported(fileHash)) {
    await archiveFile(filePath, "processed");
    return;
  }

  const runId = await createIngestionRun(fileName, fileHash);
  try {
    const parsed = parseBookingEventsCsv(bytes.toString("utf8"));
    await importEventsTransaction(runId, fileName, parsed.events, parsed.skippedCount, parsed.warnings);
  } catch (error) {
    await failIngestionRun(runId, error);
    await archiveFile(filePath, "failed");
    return;
  }

  // The database import is already committed. If archiving fails, keep the run
  // successful; the next scan recognizes the hash and retries only the move.
  await archiveFile(filePath, "processed");
}

export async function runEventCsvIngestion(): Promise<void> {
  await mkdir(eventCsvInbox, { recursive: true });
  const entries = await readdir(eventCsvInbox, { withFileTypes: true });
  const now = Date.now();

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".csv")) continue;
    const filePath = join(eventCsvInbox, entry.name);
    const fileStat = await stat(filePath);
    if (now - fileStat.mtimeMs < FILE_SETTLE_MS) continue;
    await ingestFile(filePath);
  }
}

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await runEventCsvIngestion();
  } catch (error) {
    console.error("Event CSV ingestion failed:", error);
  } finally {
    running = false;
  }
}

export function startEventCsvIngestionJob(): void {
  if (timer !== undefined) return;
  void tick();
  timer = setInterval(() => void tick(), SCAN_INTERVAL_MS);
  timer.unref();
}

export function stopEventCsvIngestionJob(): void {
  if (timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
}

export async function getEventIngestionStatus() {
  return findLastSuccessfulIngestion();
}
