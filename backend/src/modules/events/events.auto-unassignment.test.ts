import assert from "node:assert/strict";
import test from "node:test";

import { getAutoUnassignmentCutoff } from "./events.auto-unassignment.js";

test("auto-unassignment cutoff is exactly one day before the run time", () => {
  const now = new Date("2026-11-06T14:30:00.000Z");

  const cutoff = getAutoUnassignmentCutoff(now);

  assert.equal(cutoff.toISOString(), "2026-11-05T14:30:00.000Z");
  assert.equal(now.toISOString(), "2026-11-06T14:30:00.000Z");
});
