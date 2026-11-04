import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../../shared/errors.js";
import { parseIdentifier } from "./events.schema.js";
import {
  validatePalletAssignment,
  validatePalletRemoval,
} from "./events.rules.js";

const availablePallet = {
  id: "L1-R1-S1",
  eventId: null,
  locked: false,
};

test("parseIdentifier accepts known event and pallet ID formats", () => {
  assert.equal(parseIdentifier("EVT-001", "eventId"), "EVT-001");
  assert.equal(parseIdentifier("L1-R1-S1", "palletId"), "L1-R1-S1");
  assert.throws(() => parseIdentifier("bad/id", "eventId"));
});

test("validatePalletAssignment accepts an available pallet", () => {
  assert.doesNotThrow(() =>
    validatePalletAssignment(
      { id: "EVT-001", status: "scheduled" },
      availablePallet,
    ),
  );
});

test("validatePalletAssignment rejects completed, locked, and assigned pallets", () => {
  const isConflict = (error: unknown): boolean =>
    error instanceof HttpError && error.statusCode === 409;

  assert.throws(
    () =>
      validatePalletAssignment(
        { id: "EVT-001", status: "completed" },
        availablePallet,
      ),
    isConflict,
  );
  assert.throws(
    () =>
      validatePalletAssignment(
        { id: "EVT-001", status: "scheduled" },
        { ...availablePallet, locked: true },
      ),
    isConflict,
  );
  assert.throws(
    () =>
      validatePalletAssignment(
        { id: "EVT-001", status: "scheduled" },
        { ...availablePallet, eventId: "EVT-002" },
      ),
    isConflict,
  );
});

test("validatePalletRemoval only removes the requested event assignment", () => {
  assert.doesNotThrow(() =>
    validatePalletRemoval("EVT-001", {
      ...availablePallet,
      eventId: "EVT-001",
    }),
  );
  assert.throws(() =>
    validatePalletRemoval("EVT-001", {
      ...availablePallet,
      eventId: "EVT-002",
    }),
  );
});
