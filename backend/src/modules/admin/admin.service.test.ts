import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../../shared/errors.js";
import {
  parseAdminSettingsUpdate,
  parseDefaultQuantity,
  parseNamedAdminInput,
} from "./admin.service.js";

test("parseNamedAdminInput trims valid input", () => {
  assert.deepEqual(
    parseNamedAdminInput({
      name: "  Banquet  ",
      description: "  Formal event  ",
    }),
    { name: "Banquet", description: "Formal event" },
  );
});

test("parseNamedAdminInput requires a name", () => {
  assert.throws(
    () => parseNamedAdminInput({ name: " " }),
    (error: unknown) =>
      error instanceof HttpError && error.statusCode === 400,
  );
});

test("parseDefaultQuantity requires a positive integer", () => {
  assert.equal(parseDefaultQuantity({ defaultQuantity: 25 }), 25);
  assert.throws(() => parseDefaultQuantity({ defaultQuantity: 0 }));
});

test("parseAdminSettingsUpdate validates fields and limits", () => {
  assert.deepEqual(
    parseAdminSettingsUpdate({
      storageLevelCount: 3,
      cameraCount: 0,
      assetTrackingThresholdHours: 6,
    }),
    {
      storageLevelCount: 3,
      cameraCount: 0,
      assetTrackingThresholdHours: 6,
    },
  );

  assert.throws(() =>
    parseAdminSettingsUpdate({ assetTrackingThresholdHours: 5 }),
  );
  assert.throws(() => parseAdminSettingsUpdate({ unknownSetting: 1 }));
});
