
import { Router } from "express";
import {
  getLiftStatus,
  moveLiftController,
  stopLiftController,
  resumeLiftController,
  liftHeartbeatController,
  checkLiftHeartbeatController,
} from "./scissor-lift.controller.js";

const router = Router();

router.get("/status", getLiftStatus);
router.post("/move", moveLiftController);
router.post("/stop", stopLiftController);
router.post("/resume", resumeLiftController);
router.post("/heartbeat", liftHeartbeatController);
router.get("/heartbeat/status", checkLiftHeartbeatController);
export default router;
