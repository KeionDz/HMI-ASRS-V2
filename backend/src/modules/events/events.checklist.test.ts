import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../../shared/errors.js";
import {
  parseChecklistQuantity,
  parsePositiveInteger,
} from "./events.schema.js";
import { validateChecklistEdit } from "./events.rules.js";

test("parseChecklistQuantity accepts a positive integer", () => {
  assert.equal(parseChecklistQuantity({ requiredQuantity: 120 }), 120);
});

test("parseChecklistQuantity rejects invalid quantities", () => {
  assert.throws(() => parseChecklistQuantity({ requiredQuantity: 0 }));
  assert.throws(() => parseChecklistQuantity({ requiredQuantity: 2.5 }));
  assert.throws(() => parseChecklistQuantity(null));
});

test("parsePositiveInteger validates inventory item IDs", () => {
  assert.equal(parsePositiveInteger("12", "inventoryItemId"), 12);
  assert.throws(() => parsePositiveInteger("0", "inventoryItemId"));
  assert.throws(() => parsePositiveInteger("chair", "inventoryItemId"));
});

test("validateChecklistEdit rejects completed events", () => {
  assert.doesNotThrow(() =>
    validateChecklistEdit({ id: "EVT-001", status: "scheduled" }),
  );
  assert.throws(
    () => validateChecklistEdit({ id: "EVT-000", status: "completed" }),
    (error: unknown) =>
      error instanceof HttpError && error.statusCode === 409,
  );
});
