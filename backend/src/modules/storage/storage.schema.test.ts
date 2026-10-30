import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../../shared/errors.js";
import { parseStorageFilters } from "./storage.schema.js";

test("parseStorageFilters accepts level and status", () => {
  assert.deepEqual(parseStorageFilters({ level: "2", status: "occupied" }), {
    level: 2,
    status: "occupied",
  });
});

test("parseStorageFilters rejects invalid values", () => {
  assert.throws(
    () => parseStorageFilters({ level: "0" }),
    (error: unknown) =>
      error instanceof HttpError && error.statusCode === 400,
  );
  assert.throws(() => parseStorageFilters({ status: "missing" }));
});
