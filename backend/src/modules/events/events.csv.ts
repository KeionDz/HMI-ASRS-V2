import { createHash } from "node:crypto";

const REQUIRED_HEADERS = [
  "Booking: Record ID",
  "Booking: Booking Post As",
  "Booking: Status",
  "Booking Event: Name",
  "Event Classification",
  "Start Date",
  "Start Time 12 Hour",
  "Function Room",
  "Agreed",
] as const;

export interface ImportedEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  floor: number;
  guests: number;
  eventType: string | null;
}

export interface ParsedEventCsv {
  events: ImportedEvent[];
  skippedCount: number;
  warnings: string[];
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unclosed quoted field");
  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function parseDate(value: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function parseTime(value: string): string | null {
  if (!value.trim()) return "00:00";
  const match = /^(\d{1,2}):(\d{2})\s+(AM|PM)$/i.exec(value.trim());
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  if (match[3]!.toUpperCase() === "AM") hour %= 12;
  else hour = hour % 12 + 12;

  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function makeEventId(values: string[]): string {
  // shortcut: The sample has no row-level event ID. Replace this composite key
  // when the production export provides a stable booking-event identifier.
  const hash = createHash("sha256").update(values.join("\u001f")).digest("hex");
  return `CSV-${hash.slice(0, 24)}`;
}

export function parseBookingEventsCsv(text: string): ParsedEventCsv {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  const headers = rows.shift()?.map((header) => header.trim());
  if (!headers) throw new Error("CSV is empty");

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`CSV is missing required headers: ${missingHeaders.join(", ")}`);
  }

  const events = new Map<string, ImportedEvent>();
  const warnings: string[] = [];
  let skippedCount = 0;

  rows.forEach((cells, rowIndex) => {
    const rowNumber = rowIndex + 2;
    if (cells.length !== headers.length) {
      warnings.push(`Row ${rowNumber}: expected ${headers.length} columns, received ${cells.length}`);
      skippedCount += 1;
      return;
    }

    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index]!.trim()]));
    const bookingId = row["Booking: Record ID"]!;
    const bookingTitle = row["Booking: Booking Post As"]!;
    const eventName = row["Booking Event: Name"]!;
    const status = row["Booking: Status"]!;
    const date = parseDate(row["Start Date"]!);
    const time = parseTime(row["Start Time 12 Hour"]!);
    const venue = row["Function Room"]!;
    const agreed = row.Agreed!;

    if (!bookingId || !bookingTitle || !eventName || !venue || !date || !time) {
      warnings.push(`Row ${rowNumber}: missing or invalid required event data`);
      skippedCount += 1;
      return;
    }
    if (status.toLowerCase() !== "definite") {
      warnings.push(`Row ${rowNumber}: unsupported booking status "${status}"`);
      skippedCount += 1;
      return;
    }
    if (agreed && (!/^\d+$/.test(agreed) || Number(agreed) < 0)) {
      warnings.push(`Row ${rowNumber}: Agreed must be a non-negative integer`);
      skippedCount += 1;
      return;
    }
    if (!row["Start Time 12 Hour"]) warnings.push(`Row ${rowNumber}: missing start time defaulted to 00:00`);
    if (!agreed) warnings.push(`Row ${rowNumber}: missing agreed guest count defaulted to 0`);

    const id = makeEventId([bookingId, eventName, row["Start Date"]!, row["Start Time 12 Hour"]!, venue]);
    if (events.has(id)) {
      warnings.push(`Row ${rowNumber}: duplicate event row skipped`);
      skippedCount += 1;
      return;
    }

    events.set(id, {
      id,
      title: `${bookingTitle} - ${eventName}`,
      date,
      time,
      venue,
      floor: 0,
      guests: agreed ? Number(agreed) : 0,
      eventType: row["Event Classification"] || null,
    });
  });

  if (events.size === 0) throw new Error("CSV contains no valid event rows");
  return { events: [...events.values()], skippedCount, warnings };
}
