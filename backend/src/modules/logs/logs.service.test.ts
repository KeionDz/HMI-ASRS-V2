import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../../shared/errors.js";
import {
  logToCsvRow,
  parseLogsQuery,
  type LogRecord,
} from "./logs.service.js";

test("parseLogsQuery applies filters and paging", () => {
  const query = parseLogsQuery({
    dateFrom: "2026-10-01",
    dateTo: "2026-10-21",
    level: "warn",
    category: "device",
    page: "2",
    pageSize: "25",
  });

  assert.equal(query.level, "warn");
  assert.equal(query.category, "device");
  assert.equal(query.page, 2);
  assert.equal(query.pageSize, 25);
  assert.equal(query.dateFrom?.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(query.dateTo?.toISOString(), "2026-10-21T23:59:59.999Z");
});

test("parseLogsQuery rejects invalid filters", () => {
  assert.throws(
    () => parseLogsQuery({ level: "fatal" }),
    (error: unknown) =>
      error instanceof HttpError && error.statusCode === 400,
  );
});

test("logToCsvRow escapes commas and quotes", () => {
  const record: LogRecord = {
    id: 1,
    timestamp: new Date("2026-10-21T00:00:00.000Z"),
    level: "info",
    category: "audit",
    source: "events",
    actor: "operator",
    palletId: "PAL-001",
    eventId: "EVT-001",
    message: 'Assigned "chairs, tables"',
    details: { quantity: 20 },
  };

  const csv = logToCsvRow(record);

  assert.match(csv, /"Assigned ""chairs, tables"""/);
  assert.match(csv, /"\{""quantity"":20\}"/);
});
