import { Router } from "express";
import { parseStorageFilters } from "./storage.schema.js";
import { listStorageSlots } from "./storage.service.js";

const router = Router();

router.get("/", async (request, response) => {
  const filters = parseStorageFilters(request.query);
  response.json({ data: await listStorageSlots(filters) });
});

export default router;
