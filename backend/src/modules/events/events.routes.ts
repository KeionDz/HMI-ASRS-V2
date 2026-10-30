import { Router } from "express";
import { parseIdentifier } from "./events.schema.js";
import {
  assignPallet,
  listUpcomingEvents,
  removePalletAssignment,
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

export default router;
