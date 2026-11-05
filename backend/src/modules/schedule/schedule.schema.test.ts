import assert from "node:assert/strict";
import { test } from "node:test";

import { HttpError } from "../../shared/errors.js";
import { parseScheduleInput } from "./schedule.schema.js";

function validInput(): Record<string, unknown> {
  return {
    kind: "maintenance",
    agvId: "agv-1",
    scheduledAt: new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ).toISOString(),
    actor: "operator",
  };
}

function expectInvalid(body: unknown): void {
  assert.throws(
    () => parseScheduleInput(body),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 400,
  );
}

test("maintenance schedules default to disabled", () => {
  const schedule = parseScheduleInput(validInput());

  assert.equal(schedule.enabled, false);
  assert.equal(schedule.agvId, "agv-1");
  assert.equal(schedule.palletId, null);
});

test("dispatch allows automatic robot selection", () => {
  const schedule = parseScheduleInput({
    ...validInput(),
    kind: "dispatch",
    agvId: undefined,
    palletId: " PALLET-001 ",
    enabled: true,
    actor: " operator ",
  });

  assert.equal(schedule.agvId, null);
  assert.equal(schedule.palletId, "PALLET-001");
  assert.equal(schedule.enabled, true);
  assert.equal(schedule.actor, "operator");
});

test("dispatch allows a specified robot", () => {
  const schedule = parseScheduleInput({
    ...validInput(),
    kind: "dispatch",
    agvId: "agv-2",
    palletId: "PALLET-001",
  });

  assert.equal(schedule.agvId, "agv-2");
});

test("rejects invalid request bodies", () => {
  for (const body of [null, [], "schedule", 1]) {
    expectInvalid(body);
  }
});

test("rejects unknown schedule kinds", () => {
  expectInvalid({ ...validInput(), kind: "unknown" });
});

test("maintenance requires a robot and forbids a pallet", () => {
  expectInvalid({ ...validInput(), agvId: null });
  expectInvalid({ ...validInput(), palletId: "PALLET-001" });
});

test("dispatch requires a pallet", () => {
  expectInvalid({ ...validInput(), kind: "dispatch" });
});

test("rejects invalid robot IDs", () => {
  expectInvalid({ ...validInput(), agvId: "agv-99" });
});

test("rejects past dates and dates without a timezone", () => {
  expectInvalid({
    ...validInput(),
    scheduledAt: "2000-01-01T10:00:00Z",
  });

  expectInvalid({
    ...validInput(),
    scheduledAt: "2099-01-01T10:00:00",
  });

  expectInvalid({
    ...validInput(),
    scheduledAt: "invalid",
  });
});

test("rejects non-boolean enabled values", () => {
  expectInvalid({ ...validInput(), enabled: "true" });
});

test("rejects blank actors", () => {
  expectInvalid({ ...validInput(), actor: " " });
});