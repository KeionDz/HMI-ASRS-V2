import { Router } from "express";
import { PROCESS_BUTTON_MATRIX } from "./process.rules.js";
import {
  parseCreateProcessRun,
  parseProcessActor,
  parseProcessError,
  parseProcessPalletId,
  parseProcessRunId,
} from "./process.schema.js";
import {
  continueProcessRun,
  createProcessRun,
  getProcessRun,
  listProcessRuns,
  reportPalletError,
  reportProcessError,
  resumeProcessRun,
  stopProcessRun,
} from "./process.service.js";

const router = Router();

router.get("/button-states", (_request, response) => {
  response.json({ data: PROCESS_BUTTON_MATRIX });
});

router.get("/", async (_request, response) => {
  response.json({ data: await listProcessRuns() });
});

router.post("/", async (request, response) => {
  const run = await createProcessRun(parseCreateProcessRun(request.body));
  response.status(201).json({ data: run });
});

router.get("/:runId", async (request, response) => {
  const runId = parseProcessRunId(request.params.runId);
  response.json({ data: await getProcessRun(runId) });
});

router.post("/:runId/continue", async (request, response) => {
  const runId = parseProcessRunId(request.params.runId);
  const actor = parseProcessActor(request.body);
  response.json({ data: await continueProcessRun(runId, actor) });
});

router.post("/:runId/stop", async (request, response) => {
  const runId = parseProcessRunId(request.params.runId);
  const actor = parseProcessActor(request.body);
  response.json({ data: await stopProcessRun(runId, actor) });
});

router.post("/:runId/error", async (request, response) => {
  const runId = parseProcessRunId(request.params.runId);
  response.json({
    data: await reportProcessError(runId, parseProcessError(request.body)),
  });
});

router.post(
  "/:runId/pallets/:palletId/error",
  async (request, response) => {
    const runId = parseProcessRunId(request.params.runId);
    const palletId = parseProcessPalletId(request.params.palletId);
    response.json({
      data: await reportPalletError(
        runId,
        palletId,
        parseProcessError(request.body),
      ),
    });
  },
);

router.post("/:runId/resume", async (request, response) => {
  const runId = parseProcessRunId(request.params.runId);
  const actor = parseProcessActor(request.body);
  response.json({ data: await resumeProcessRun(runId, actor) });
});

export default router;
