import assert from "node:assert/strict";
import { test } from "node:test";
import { parseReading, parseRegistration } from "./assets.schema.js";

test("valid asset registration", () => {
  assert.deepEqual(parseRegistration({ id: " A1 ", bleTag: " TAG1 ", name: " Chair " }), { id: "A1", bleTag: "TAG1", name: "Chair" });
});
test("valid reading", () => {
  assert.deepEqual(parseReading({ bleTag: "TAG1", location: "inside", batteryLevel: 45 }), { bleTag: "TAG1", location: "inside", batteryLevel: 45 });
});
test("reject invalid battery", () => { assert.throws(() => parseReading({ bleTag: "TAG1", location: "inside", batteryLevel: 101 })); });
test("reject invalid location", () => { assert.throws(() => parseReading({ bleTag: "TAG1", location: "hallway" })); });
test("reject missing BLE tag", () => { assert.throws(() => parseReading({ location: "outside" })); });
