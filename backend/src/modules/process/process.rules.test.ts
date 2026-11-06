import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../../shared/errors.js";
import {
  firstProcessStep,
  nextProcessStep,
  processButtons,
} from "./process.rules.js";
import {
  parseCreateProcessRun,
  parseProcessRunId,
} from "./process.schema.js";

test("process sequences preserve profile, lift, ASRS, and venue steps", () => {
  assert.equal(
    firstProcessStep("retrieve_to_venue"),
    "profile_requested",
  );
  assert.equal(
    nextProcessStep("retrieve_to_venue", "asrs_retrieve"),
    "venue_delivery",
  );
  assert.equal(
    nextProcessStep("retrieve_to_venue", "venue_delivery"),
    null,
  );
  assert.equal(
    nextProcessStep("store_back", "shutter_open"),
    "asrs_store",
  );
});

test("button states only enable valid run actions", () => {
  assert.deepEqual(processButtons("running"), {
    continue: true,
    stop: true,
    reportRunError: true,
    reportPalletError: true,
    resume: false,
  });
  assert.equal(processButtons("error").resume, true);
  assert.equal(processButtons("completed").continue, false);
});

test("process input requires a venue and unique pallet IDs", () => {
  assert.throws(
    () =>
      parseCreateProcessRun({
        mode: "retrieve_to_venue",
        palletIds: ["L1-R1-S1"],
      }),
    (error: unknown) =>
      error instanceof HttpError && error.statusCode === 400,
  );
  assert.throws(() =>
    parseCreateProcessRun({
      mode: "store_back",
      palletIds: ["L1-R1-S1", "L1-R1-S1"],
    }),
  );
  assert.deepEqual(
    parseCreateProcessRun({
      mode: "retrieve_to_venue",
      venue: "Ballroom 1",
      palletIds: ["L1-R1-S1"],
    }),
    {
      mode: "retrieve_to_venue",
      eventId: null,
      venue: "Ballroom 1",
      requestedAgvId: null,
      palletIds: ["L1-R1-S1"],
      actor: "operator",
    },
  );
});

test("run ID validation accepts positive integers only", () => {
  assert.equal(parseProcessRunId("12"), 12);
  assert.throws(() => parseProcessRunId("0"));
  assert.throws(() => parseProcessRunId("run-1"));
});
