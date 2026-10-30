
import assert from "node:assert/strict";
import { test } from "node:test";

import { moveLift } from "./scissor-lift.service.js";

test("rejects an invalid lift direction", async () => {
  await assert.rejects(
    () => moveLift("sideways" as "up"),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, "Direction must be up or down");
      return true;
    },
  );
});
