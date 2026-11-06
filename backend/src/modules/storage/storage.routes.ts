import { Router } from "express";
import {
  parseAdminOverride,
  parseInventoryItemId,
  parsePalletContentQuantity,
  parseStorageFilters,
  parseStorageIdentifier,
} from "./storage.schema.js";
import {
  listStorageSlots,
  lockPallet,
  removePalletContent,
  savePalletContent,
  unlockPallet,
} from "./storage.service.js";
import { getAsrsHeartbeatStatus } from "./asrs.repository.js";
import { getDeviceAlarms } from "../../shared/device-alarms.js";

const router = Router();

router.get("/asrs/status", async (_request, response) => {
  response.json({
    data: await getAsrsHeartbeatStatus(),
  });
});

router.get("/devices/:deviceId/alarms", async (request, response) => {
  response.json({
    data: await getDeviceAlarms(request.params.deviceId),
  });
});

router.get("/", async (request, response) => {
  const filters = parseStorageFilters(request.query);
  response.json({ data: await listStorageSlots(filters) });
});

router.post("/:palletId/lock", async (request, response) => {
  const palletId = parseStorageIdentifier(
    request.params.palletId,
    "palletId",
  );
  response.json({ data: await lockPallet(palletId) });
});

router.delete("/:palletId/lock", async (request, response) => {
  const palletId = parseStorageIdentifier(
    request.params.palletId,
    "palletId",
  );
  const adminOverride = parseAdminOverride(request.query.adminOverride);
  response.json({ data: await unlockPallet(palletId, adminOverride) });
});

router.put(
  "/:palletId/contents/:inventoryItemId",
  async (request, response) => {
    const palletId = parseStorageIdentifier(
      request.params.palletId,
      "palletId",
    );
    const inventoryItemId = parseInventoryItemId(
      request.params.inventoryItemId,
    );
    const quantity = parsePalletContentQuantity(request.body);
    const content = await savePalletContent(
      palletId,
      inventoryItemId,
      quantity,
    );

    response.json({ data: content });
  },
);

router.delete(
  "/:palletId/contents/:inventoryItemId",
  async (request, response) => {
    const palletId = parseStorageIdentifier(
      request.params.palletId,
      "palletId",
    );
    const inventoryItemId = parseInventoryItemId(
      request.params.inventoryItemId,
    );
    await removePalletContent(palletId, inventoryItemId);

    response.status(204).send();
  },
);

export default router;
