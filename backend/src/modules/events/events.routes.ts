import { Router } from "express";
import {
  parseChecklistQuantity,
  parseIdentifier,
  parsePositiveInteger,
} from "./events.schema.js";
import {
  assignPallet,
  getEventChecklist,
  listUpcomingEvents,
  removeChecklistItem,
  removePalletAssignment,
  saveChecklistItem,
} from "./events.service.js";

const router = Router();

router.get("/", async (_request, response) => {
  response.json({ data: await listUpcomingEvents() });
});

router.post("/:eventId/pallets/:palletId", async (request, response) => {
  const eventId = parseIdentifier(request.params.eventId, "eventId");
  const palletId = parseIdentifier(request.params.palletId, "palletId");
  const assignment = await assignPallet(eventId, palletId);

  response.json({ data: assignment });
});

router.delete("/:eventId/pallets/:palletId", async (request, response) => {
  const eventId = parseIdentifier(request.params.eventId, "eventId");
  const palletId = parseIdentifier(request.params.palletId, "palletId");
  const assignment = await removePalletAssignment(eventId, palletId);

  response.json({ data: assignment });
});

router.get("/:eventId/checklist", async (request, response) => {
  const eventId = parseIdentifier(request.params.eventId, "eventId");
  response.json({ data: await getEventChecklist(eventId) });
});

router.put(
  "/:eventId/checklist/:inventoryItemId",
  async (request, response) => {
    const eventId = parseIdentifier(request.params.eventId, "eventId");
    const inventoryItemId = parsePositiveInteger(
      request.params.inventoryItemId,
      "inventoryItemId",
    );
    const requiredQuantity = parseChecklistQuantity(request.body);
    const item = await saveChecklistItem(
      eventId,
      inventoryItemId,
      requiredQuantity,
    );

    response.json({ data: item });
  },
);

router.delete(
  "/:eventId/checklist/:inventoryItemId",
  async (request, response) => {
    const eventId = parseIdentifier(request.params.eventId, "eventId");
    const inventoryItemId = parsePositiveInteger(
      request.params.inventoryItemId,
      "inventoryItemId",
    );
    await removeChecklistItem(eventId, inventoryItemId);

    response.status(204).send();
  },
);

export default router;
