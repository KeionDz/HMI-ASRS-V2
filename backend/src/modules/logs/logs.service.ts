import { pool } from "../../db/pool.js";
import { HttpError } from "../../shared/errors.js";
import {
  LOG_CATEGORIES,
  LOG_LEVELS,
  log,
  type LogCategory,
  type LogLevel,
} from "../../shared/logger.js";

export interface LogRecord {
  id: number;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  source: string;
  actor: string;
  palletId: string | null;
  eventId: string | null;
  message: string;
  details: Record<string, unknown>;
}

export interface LogFilters {
  dateFrom?: Date;
  dateTo?: Date;
  level?: LogLevel;
  category?: LogCategory;
  source?: string;
  actor?: string;
  palletId?: string;
  eventId?: string;
  search?: string;
}

export interface LogsQuery extends LogFilters {
  page: number;
  pageSize: number;
}

export interface PaginatedLogs {
  data: LogRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

type QueryParameters = Record<string, unknown>;

const LOG_COLUMNS = `
  id,
  timestamp,
  level,
  category,
  source,
  actor,
  pallet_id AS "palletId",
  event_id AS "eventId",
  message,
  details
`;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const EXPORT_BATCH_SIZE = 500;

function readString(value: unknown, name: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${name} must be a single string`);
  }

  return value.trim() || undefined;
}

function readPositiveInteger(
  value: unknown,
  name: string,
  fallback: number,
  maximum: number,
): number {
  const text = readString(value, name);

  if (text === undefined) {
    return fallback;
  }

  if (!/^\d+$/.test(text)) {
    throw new HttpError(400, `${name} must be a positive integer`);
  }

  const number = Number(text);

  if (number < 1 || number > maximum) {
    throw new HttpError(400, `${name} must be between 1 and ${maximum}`);
  }

  return number;
}

function readChoice<T extends string>(
  value: unknown,
  name: string,
  choices: readonly T[],
): T | undefined {
  const text = readString(value, name);

  if (text === undefined) {
    return undefined;
  }

  if (!choices.includes(text as T)) {
    throw new HttpError(400, `${name} must be one of: ${choices.join(", ")}`);
  }

  return text as T;
}

function readDate(
  value: unknown,
  name: string,
  endOfDay: boolean,
): Date | undefined {
  const text = readString(value, name);

  if (text === undefined) {
    return undefined;
  }

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
    : text;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${name} must be a valid ISO date`);
  }

  return date;
}

export function parseLogsQuery(query: QueryParameters): LogsQuery {
  const dateFrom = readDate(query.dateFrom, "dateFrom", false);
  const dateTo = readDate(query.dateTo, "dateTo", true);
  const search = readString(query.search, "search");

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new HttpError(400, "dateFrom must not be after dateTo");
  }

  if (search && search.length > 200) {
    throw new HttpError(400, "search must not exceed 200 characters");
  }

  return {
    dateFrom,
    dateTo,
    level: readChoice(query.level, "level", LOG_LEVELS),
    category: readChoice(query.category, "category", LOG_CATEGORIES),
    source: readString(query.source, "source"),
    actor: readString(query.actor, "actor"),
    palletId: readString(query.palletId, "palletId"),
    eventId: readString(query.eventId, "eventId"),
    search,
    page: readPositiveInteger(query.page, "page", 1, 1_000_000),
    pageSize: readPositiveInteger(query.pageSize, "pageSize", 50, 100),
  };
}

function buildWhere(filters: LogFilters, afterId?: number): {
  sql: string;
  values: unknown[];
} {
  const conditions: string[] = [];
  const values: unknown[] = [];

  const add = (condition: string, value: unknown): void => {
    values.push(value);
    conditions.push(condition.replace("?", `$${values.length}`));
  };

  if (filters.dateFrom) add("timestamp >= ?", filters.dateFrom);
  if (filters.dateTo) add("timestamp <= ?", filters.dateTo);
  if (filters.level) add("level = ?", filters.level);
  if (filters.category) add("category = ?", filters.category);
  if (filters.source) add("source = ?", filters.source);
  if (filters.actor) add("actor = ?", filters.actor);
  if (filters.palletId) add("pallet_id = ?", filters.palletId);
  if (filters.eventId) add("event_id = ?", filters.eventId);

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const placeholder = `$${values.length}`;
    conditions.push(`(
      message ILIKE ${placeholder}
      OR source ILIKE ${placeholder}
      OR actor ILIKE ${placeholder}
      OR details::text ILIKE ${placeholder}
    )`);
  }

  if (afterId !== undefined) add("id > ?", afterId);

  return {
    sql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
}

export async function listLogs(query: LogsQuery): Promise<PaginatedLogs> {
  const where = buildWhere(query);
  const offset = (query.page - 1) * query.pageSize;
  const limitPlaceholder = `$${where.values.length + 1}`;
  const offsetPlaceholder = `$${where.values.length + 2}`;

  const [countResult, logsResult] = await Promise.all([
    pool.query<{ total: number }>(
      `SELECT COUNT(*)::integer AS total FROM logs ${where.sql}`,
      where.values,
    ),
    pool.query<LogRecord>(
      `
        SELECT ${LOG_COLUMNS}
        FROM logs
        ${where.sql}
        ORDER BY timestamp DESC, id DESC
        LIMIT ${limitPlaceholder}
        OFFSET ${offsetPlaceholder}
      `,
      [...where.values, query.pageSize, offset],
    ),
  ]);

  const total = countResult.rows[0]?.total ?? 0;

  return {
    data: logsResult.rows,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function* streamLogs(
  filters: LogFilters,
): AsyncGenerator<LogRecord> {
  let afterId = 0;

  while (true) {
    const where = buildWhere(filters, afterId);
    const limitPlaceholder = `$${where.values.length + 1}`;
    const result = await pool.query<LogRecord>(
      `
        SELECT ${LOG_COLUMNS}
        FROM logs
        ${where.sql}
        ORDER BY id ASC
        LIMIT ${limitPlaceholder}
      `,
      [...where.values, EXPORT_BATCH_SIZE],
    );

    if (result.rows.length === 0) {
      return;
    }

    for (const record of result.rows) {
      yield record;
    }

    afterId = result.rows[result.rows.length - 1]!.id;
  }
}

function csvValue(value: unknown): string {
  const text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : String(value ?? "");

  return `"${text.replaceAll('"', '""')}"`;
}

export const LOG_CSV_HEADER =
  "id,timestamp,level,category,source,actor,palletId,eventId,message,details";

export function logToCsvRow(record: LogRecord): string {
  return [
    record.id,
    record.timestamp,
    record.level,
    record.category,
    record.source,
    record.actor,
    record.palletId,
    record.eventId,
    record.message,
    record.details,
  ]
    .map(csvValue)
    .join(",");
}

export async function getLogRetentionDays(): Promise<number> {
  const result = await pool.query<{ logRetentionDays: number }>(`
    SELECT log_retention_days AS "logRetentionDays"
    FROM admin_settings
    WHERE id = 1
  `);

  return result.rows[0]?.logRetentionDays ?? 90;
}

export async function cleanupExpiredLogs(): Promise<number> {
  const retentionDays = await getLogRetentionDays();
  const result = await pool.query(
    `
      DELETE FROM logs
      WHERE timestamp < NOW() - ($1::integer * INTERVAL '1 day')
    `,
    [retentionDays],
  );
  const deletedCount = result.rowCount ?? 0;

  await log({
    level: "info",
    category: "system",
    source: "logs.retention",
    actor: "system",
    message: "Log retention cleanup completed",
    details: { retentionDays, deletedCount },
  });

  return deletedCount;
}

export function startLogRetentionJob(): NodeJS.Timeout {
  const runCleanup = (): void => {
    void cleanupExpiredLogs().catch((error: unknown) => {
      console.error("Log retention cleanup failed:", error);
    });
  };

  runCleanup();

  // ponytail: In-process timer fits one backend instance. Use an external
  // scheduler or database lock when multiple backend instances are deployed.
  const timer = setInterval(runCleanup, ONE_DAY_MS);
  timer.unref();
  return timer;
}
