import { once } from "node:events";
import { Router } from "express";
import type { Response } from "express";
import { HttpError } from "../../shared/errors.js";
import {
  LOG_CSV_HEADER,
  listLogs,
  logToCsvRow,
  parseLogsQuery,
  streamLogs,
} from "./logs.service.js";

const router = Router();

async function writeChunk(response: Response, chunk: string): Promise<void> {
  if (!response.write(chunk)) {
    await once(response, "drain");
  }
}

router.get("/", async (request, response) => {
  const query = parseLogsQuery(request.query);
  const result = await listLogs(query);

  response.setHeader("Cache-Control", "no-store");
  response.json(result);
});

router.get("/export", async (request, response) => {
  const format = request.query.format;

  if (format !== "csv" && format !== "json") {
    throw new HttpError(400, "format must be csv or json");
  }

  const filters = parseLogsQuery(request.query);
  const date = new Date().toISOString().slice(0, 10);

  response.setHeader("Cache-Control", "no-store");
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="logs-${date}.${format}"`,
  );
  response.setHeader(
    "Content-Type",
    format === "csv"
      ? "text/csv; charset=utf-8"
      : "application/json; charset=utf-8",
  );
  response.flushHeaders();

  try {
    if (format === "csv") {
      await writeChunk(response, `${LOG_CSV_HEADER}\n`);

      for await (const record of streamLogs(filters)) {
        await writeChunk(response, `${logToCsvRow(record)}\n`);
      }
    } else {
      await writeChunk(response, "[");
      let first = true;

      for await (const record of streamLogs(filters)) {
        await writeChunk(
          response,
          `${first ? "" : ","}${JSON.stringify(record)}`,
        );
        first = false;
      }

      await writeChunk(response, "]");
    }

    response.end();
  } catch (error) {
    response.destroy(error instanceof Error ? error : undefined);
  }
});

export default router;
