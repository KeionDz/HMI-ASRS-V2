import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../../shared/errors.js";
import { parseAdminOverride } from "./storage.schema.js";
import { validatePalletUnlock } from "./storage.rules.js";
import type { StoragePalletState } from "./storage.types.js";

const lockedPallet: StoragePalletState = {
  id: "L1-R1-S1",
  eventId: "EVT-001",
  locked: true,
  lockedBy: "operator-a",
  lockedAt: new Date("2026-11-05T00:00:00.000Z"),
};

test("parseAdminOverride accepts true, false, and an omitted value", () => {
  assert.equal(parseAdminOverride(undefined), false);
  assert.equal(parseAdminOverride("false"), false);
  assert.equal(parseAdminOverride("true"), true);
  assert.throws(() => parseAdminOverride("yes"));
});

test("lock owner can unlock pallet", () => {
  assert.doesNotThrow(() =>
    validatePalletUnlock(lockedPallet, "operator-a", false),
  );
});

test("non-owner needs admin override to unlock pallet", () => {
  assert.throws(
    () => validatePalletUnlock(lockedPallet, "operator-b", false),
    (error: unknown) =>
      error instanceof HttpError && error.statusCode === 403,
  );
  assert.doesNotThrow(() =>
    validatePalletUnlock(lockedPallet, "operator-b", true),
  );
});
