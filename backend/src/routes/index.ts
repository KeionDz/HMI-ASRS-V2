
import { Router } from "express";

import eventsRoutes from "../modules/events/events.routes.js";
import storageRoutes from "../modules/storage/storage.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import processRoutes from "../modules/process/process.routes.js";
import logsRoutes from "../modules/logs/logs.routes.js";
import scissorLiftRoutes from "../modules/scissor-lift/scissor-lift.routes.js";
import agvRoutes from "../modules/agv/agv.routes.js";
import assetsRoutes from "../modules/assets/assets.routes.js";
import scheduleRoutes from "../modules/schedule/schedule.routes.js";

const router = Router();

router.use("/events", eventsRoutes);
router.use("/storage", storageRoutes);
router.use("/admin", adminRoutes);
router.use("/process", processRoutes);
router.use("/logs", logsRoutes);
router.use("/scissor-lift", scissorLiftRoutes);
router.use("/agv", agvRoutes);
router.use("/assets", assetsRoutes);
router.use("/schedule", scheduleRoutes);

export default router;
