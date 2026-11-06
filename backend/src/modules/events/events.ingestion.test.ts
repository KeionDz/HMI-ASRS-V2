import assert from "node:assert/strict";
import test from "node:test";

import { parseBookingEventsCsv } from "./events.csv.js";

const HEADER = "Booking: Record ID,Booking: Booking Post As,Booking: Status,Booking Event: Name,Event Classification,Function Room Setup,Start Date,Start Time 12 Hour,End Date,End Time 12 Hour,Function Room,Agreed";

test("parses booking events and keeps quoted commas", () => {
  const csv = `${HEADER}\nabc123,"Annual Meeting, 2026",Definite,Reception,Cocktail Reception,Banquet,11/6/2026,6:30 PM,11/6/2026,9:00 PM,Strata Ballroom,120`;
  const result = parseBookingEventsCsv(csv);

  assert.equal(result.events.length, 1);
  assert.deepEqual(result.events[0], {
    id: result.events[0]!.id,
    title: "Annual Meeting, 2026 - Reception",
    date: "2026-11-06",
    time: "18:30",
    venue: "Strata Ballroom",
    floor: 0,
    guests: 120,
    eventType: "Cocktail Reception",
  });
  assert.match(result.events[0]!.id, /^CSV-[a-f0-9]{24}$/);
});

test("defaults missing time and guest count with warnings", () => {
  const csv = `${HEADER}\nabc123,Annual Meeting,Definite,Tournament,Tournament,Custom,11/10/2026,,11/10/2026,,Restaurant,`;
  const result = parseBookingEventsCsv(csv);

  assert.equal(result.events[0]!.time, "00:00");
  assert.equal(result.events[0]!.guests, 0);
  assert.equal(result.warnings.length, 2);
});

test("skips duplicate event rows", () => {
  const row = "abc123,Annual Meeting,Definite,Reception,Meeting,Classroom,11/6/2026,9:00 AM,11/6/2026,5:00 PM,Room A,50";
  const result = parseBookingEventsCsv(`${HEADER}\n${row}\n${row}`);

  assert.equal(result.events.length, 1);
  assert.equal(result.skippedCount, 1);
});

test("rejects a structurally incompatible CSV", () => {
  assert.throws(
    () => parseBookingEventsCsv("Booking: Record ID,Start Date\nabc,11/6/2026"),
    /missing required headers/,
  );
});
