
import { Router } from "express";

import {
  getAgvStatusController,
  getAgvByIdController,
  autoDispatchController,
  manualDispatchController,
  completeAgvController,
  updateAgvBatteryController,
  setAgvChargingController,
  updateAgvHeartbeatController,
  setAgvErrorController,
  recoverAgvController,
} from "./agv.controller.js";

const router = Router();

router.get("/status", getAgvStatusController);

router.post("/dispatch/auto", autoDispatchController);
router.post("/dispatch/manual", manualDispatchController);
router.post("/complete", completeAgvController);

router.post("/battery", updateAgvBatteryController);
router.post("/charging", setAgvChargingController);
router.post("/heartbeat", updateAgvHeartbeatController);
router.post("/error", setAgvErrorController);
router.post("/recover", recoverAgvController);

router.get("/:id", getAgvByIdController);

export default router;
