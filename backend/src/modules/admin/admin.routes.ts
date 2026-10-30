import { Router } from "express";
import { HttpError } from "../../shared/errors.js";
import {
  createEventType,
  createInventoryItem,
  deleteEventType,
  deleteInventoryItem,
  getAdminSettings,
  listEventTypeItems,
  listEventTypes,
  listInventoryItems,
  removeEventTypeItem,
  setEventTypeItem,
  updateAdminSettings,
} from "./admin.service.js";

const router = Router();
const ACTOR = "operator";

function readId(value: string, name: string): number {
  if (!/^\d+$/.test(value)) {
    throw new HttpError(400, `${name} must be a positive integer`);
  }

  const id = Number(value);
  if (id < 1) throw new HttpError(400, `${name} must be a positive integer`);
  return id;
}

router.get("/event-types", async (_request, response) => {
  response.json({ data: await listEventTypes() });
});

router.post("/event-types", async (request, response) => {
  const eventType = await createEventType(request.body, ACTOR);
  response.status(201).json({ data: eventType });
});

router.delete("/event-types/:eventTypeId", async (request, response) => {
  await deleteEventType(
    readId(request.params.eventTypeId, "eventTypeId"),
    ACTOR,
  );
  response.status(204).send();
});

router.get("/inventory-items", async (_request, response) => {
  response.json({ data: await listInventoryItems() });
});

router.post("/inventory-items", async (request, response) => {
  const item = await createInventoryItem(request.body, ACTOR);
  response.status(201).json({ data: item });
});

router.delete("/inventory-items/:inventoryItemId", async (request, response) => {
  await deleteInventoryItem(
    readId(request.params.inventoryItemId, "inventoryItemId"),
    ACTOR,
  );
  response.status(204).send();
});

router.get("/event-types/:eventTypeId/items", async (request, response) => {
  const items = await listEventTypeItems(
    readId(request.params.eventTypeId, "eventTypeId"),
  );
  response.json({ data: items });
});

router.put(
  "/event-types/:eventTypeId/items/:inventoryItemId",
  async (request, response) => {
    const association = await setEventTypeItem(
      readId(request.params.eventTypeId, "eventTypeId"),
      readId(request.params.inventoryItemId, "inventoryItemId"),
      request.body,
      ACTOR,
    );
    response.json({ data: association });
  },
);

router.delete(
  "/event-types/:eventTypeId/items/:inventoryItemId",
  async (request, response) => {
    await removeEventTypeItem(
      readId(request.params.eventTypeId, "eventTypeId"),
      readId(request.params.inventoryItemId, "inventoryItemId"),
      ACTOR,
    );
    response.status(204).send();
  },
);

router.get("/settings", async (_request, response) => {
  response.json({ data: await getAdminSettings() });
});

router.patch("/settings", async (request, response) => {
  const settings = await updateAdminSettings(request.body, ACTOR);
  response.json({ data: settings });
});

export default router;
