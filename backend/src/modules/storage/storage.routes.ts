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

const router = Router();

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
