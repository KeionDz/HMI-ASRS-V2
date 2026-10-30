
import assert from "node:assert/strict";
import { test } from "node:test";

import { validateLiftMovement } from "./scissor-lift.rules.js";
import type { ScissorLiftState } from "./scissor-lift.types.js";

function makeLift(
  changes: Partial<ScissorLiftState> = {},
): ScissorLiftState {
  return {
    id: "lift-1",
    position: "lower",
    status: "idle",
    emergencyStopped: false,
    lastHeartbeat: null,
    updatedAt: new Date().toISOString(),
    ...changes,
  };
}

test("allows moving up from lower position", () => {
  assert.doesNotThrow(() => {
    validateLiftMovement(makeLift(), "up");
  });
});

test("allows moving down from upper position", () => {
  assert.doesNotThrow(() => {
    validateLiftMovement(
      makeLift({ position: "upper" }),
      "down",
    );
  });
});

test("rejects movement during emergency stop", () => {
  assert.throws(
    () =>
      validateLiftMovement(
        makeLift({
          emergencyStopped: true,
          status: "stopped",
        }),
        "up",
      ),
    {
      message: "Lift is emergency stopped",
      statusCode: 409,
    },
  );
});

test("rejects movement when lift is in error state", () => {
  assert.throws(
    () =>
      validateLiftMovement(
        makeLift({ status: "error" }),
        "up",
      ),
    {
      message: "Lift is in an error state",
      statusCode: 409,
    },
  );
});

test("rejects movement while already moving", () => {
  assert.throws(
    () =>
      validateLiftMovement(
        makeLift({ status: "moving_up" }),
        "up",
      ),
    {
      message: "Lift is already moving",
      statusCode: 409,
    },
  );
});

test("rejects moving to the current position", () => {
  assert.throws(
    () => validateLiftMovement(makeLift(), "down"),
    {
      message: "Lift is already at lower",
      statusCode: 409,
    },
  );
});
