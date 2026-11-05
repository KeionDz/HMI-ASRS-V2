
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  dispatchAgv,
  updateAgvBattery,
  setAgvCharging,
  updateAgvHeartbeat,
  setAgvError,
  recoverAgv,
} from "./agv.service.js";

async function expectHttpError(
  action: () => Promise<unknown>,
  status: number,
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    return (
      error instanceof Error &&
      "statusCode" in error &&
      error.statusCode === status
    );
  });
}

test("rejects invalid AGV ID for heartbeat", async () => {
  await expectHttpError(
    () => updateAgvHeartbeat("agv-99"),
    400,
  );
});

test("rejects battery levels above 100", async () => {
  await expectHttpError(
    () => updateAgvBattery("agv-1", 101, "developer"),
    400,
  );
});

test("rejects negative battery levels", async () => {
  await expectHttpError(
    () => updateAgvBattery("agv-1", -1, "developer"),
    400,
  );
});

test("rejects non-boolean charging value", async () => {
  await expectHttpError(
    () => setAgvCharging("agv-1", "yes" as unknown as boolean, "developer"),
    400,
  );
});

test("rejects empty error reason", async () => {
  await expectHttpError(
    () => setAgvError("agv-1", "", "developer"),
    400,
  );
});

test("rejects invalid AGV recovery ID", async () => {
  await expectHttpError(
    () => recoverAgv("agv-99", "developer"),
    400,
  );
});

test("rejects dispatch with empty pallet ID", async () => {
  await expectHttpError(
    () => dispatchAgv({ palletId: "", actor: "developer" }),
    400,
  );
});
