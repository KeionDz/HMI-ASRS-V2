import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../../shared/errors.js";
import {
  parseInventoryItemId,
  parsePalletContentQuantity,
  parseStorageIdentifier,
} from "./storage.schema.js";
import { validatePalletContentEdit } from "./storage.rules.js";

test("pallet content input accepts valid IDs and quantity", () => {
  assert.equal(parseStorageIdentifier("L1-R1-S1", "palletId"), "L1-R1-S1");
  assert.equal(parseInventoryItemId("2"), 2);
  assert.equal(parsePalletContentQuantity({ quantity: 24 }), 24);
});

test("pallet content input rejects invalid values", () => {
  assert.throws(() => parseStorageIdentifier("bad/id", "palletId"));
  assert.throws(() => parseInventoryItemId("0"));
  assert.throws(() => parsePalletContentQuantity({ quantity: 0 }));
  assert.throws(() => parsePalletContentQuantity({ quantity: 1.5 }));
});

test("locked pallets reject content changes", () => {
  assert.doesNotThrow(() =>
    validatePalletContentEdit({
      id: "L1-R1-S1",
      eventId: null,
      locked: false,
      lockedBy: null,
      lockedAt: null,
    }),
  );
  assert.throws(
    () =>
      validatePalletContentEdit({
        id: "L1-R1-S1",
        eventId: "EVT-001",
        locked: true,
        lockedBy: "operator",
        lockedAt: new Date("2026-11-05T00:00:00.000Z"),
      }),
    (error: unknown) =>
      error instanceof HttpError && error.statusCode === 409,
  );
});
