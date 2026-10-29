
import { Router } from "express";
import {
  getLiftStatus,
  moveLiftController,
  stopLiftController,
  resumeLiftController,
} from "./scissor-lift.controller.js";

const router = Router();

router.get("/status", getLiftStatus);
router.post("/move", moveLiftController);
router.post("/stop", stopLiftController);
router.post("/resume", resumeLiftController);

export default router;
