import { Router } from "express";

import {
  listSchedulesController,
  getScheduleController,
  createScheduleController,
  updateScheduleController,
  cancelScheduleController,
} from "./schedule.controller.js";

const router = Router();

router.get("/", listSchedulesController);
router.get("/:id", getScheduleController);
router.post("/", createScheduleController);
router.put("/:id", updateScheduleController);
router.post("/:id/cancel", cancelScheduleController);

export default router;