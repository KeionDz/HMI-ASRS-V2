import { Router } from "express";

const router = Router();

router.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "asrs-backend",
    timestamp: new Date().toISOString(),
  });
});

export default router;