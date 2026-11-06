import type { PoolClient, QueryResultRow } from "pg";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../shared/errors.js";
import { log } from "../../shared/logger.js";
import {
  firstProcessStep,
  nextProcessStep,
  processButtons,
} from "./process.rules.js";
import type {
  CreateProcessRunInput,
  ProcessMode,
  ProcessPallet,
  ProcessPalletStatus,
  ProcessRun,
  ProcessStatus,
  ProcessStep,
} from "./process.types.js";

interface RunRow extends QueryResultRow {
  id: number;
  mode: ProcessMode;
  eventId: string | null;
  venue: string | null;
  requestedAgvId: string | null;
  status: ProcessStatus;
  currentPalletId: string | null;
  errorMessage: string | null;
  actor: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

interface PalletRow extends QueryResultRow {
  palletId: string;
  sequence: number;
  status: ProcessPalletStatus;
  currentStep: ProcessStep | null;
  originalCell: string;
  originalLevel: number;
  agvId: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

const RUN_COLUMNS = `
  id, mode, event_id AS "eventId", venue,
  requested_agv_id AS "requestedAgvId", status,
  current_pallet_id AS "currentPalletId",
  error_message AS "errorMessage", actor,
  created_at AS "createdAt", updated_at AS "updatedAt",
  completed_at AS "completedAt"
`;

const PALLET_COLUMNS = `
  pallet_id AS "palletId", sequence_index AS sequence, status,
  current_step AS "currentStep", original_cell AS "originalCell",
  original_level AS "originalLevel", agv_id AS "agvId",
  error_message AS "errorMessage", started_at AS "startedAt",
  completed_at AS "completedAt"
`;

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

async function loadRun(
  client: PoolClient,
  runId: number,
  lock = false,
): Promise<ProcessRun> {
  const runResult = await client.query<RunRow>(
    `SELECT ${RUN_COLUMNS} FROM process_runs WHERE id = $1${lock ? " FOR UPDATE" : ""}`,
    [runId],
  );
  const row = runResult.rows[0];
  if (!row) throw new HttpError(404, "Process run not found");

  const palletResult = await client.query<PalletRow>(
    `SELECT ${PALLET_COLUMNS} FROM process_pallets
     WHERE run_id = $1 ORDER BY sequence_index`,
    [runId],
  );

  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: iso(row.completedAt),
    pallets: palletResult.rows.map((pallet) => ({
      ...pallet,
      startedAt: iso(pallet.startedAt),
      completedAt: iso(pallet.completedAt),
    })),
    buttons: processButtons(row.status),
  };
}

async function transaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function releaseProcessAgvs(
  client: PoolClient,
  runId: number,
): Promise<void> {
  await client.query(
    `UPDATE agv_state
     SET reserved_process_run_id = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE reserved_process_run_id = $1`,
    [runId],
  );
}

export async function createProcessRunTransaction(
  input: CreateProcessRunInput,
): Promise<ProcessRun> {
  return transaction(async (client) => {
    if (input.eventId) {
      const event = await client.query(
        "SELECT 1 FROM events WHERE id = $1",
        [input.eventId],
      );
      if (event.rowCount === 0) throw new HttpError(404, "Event not found");
    }

    const pallets = await client.query<{
      id: string;
      level: number;
      rowNumber: number;
      slotNumber: number;
      status: string;
      eventId: string | null;
      locked: boolean;
    }>(
      `SELECT id, level, row_number AS "rowNumber",
              slot_number AS "slotNumber", status,
              event_id AS "eventId", is_locked AS locked
       FROM pallets WHERE id = ANY($1::varchar[]) FOR UPDATE`,
      [input.palletIds],
    );
    const byId = new Map(pallets.rows.map((pallet) => [pallet.id, pallet]));

    for (const palletId of input.palletIds) {
      const pallet = byId.get(palletId);
      if (!pallet) throw new HttpError(404, `Pallet ${palletId} not found`);
      if (pallet.locked) {
        throw new HttpError(409, `Pallet ${palletId} is locked`);
      }
      if (input.eventId && pallet.eventId !== input.eventId) {
        throw new HttpError(
          409,
          `Pallet ${palletId} is not assigned to event ${input.eventId}`,
        );
      }
      if (input.mode === "store_back" && pallet.status !== "retrieved") {
        throw new HttpError(
          409,
          `Pallet ${palletId} must be retrieved before it can be stored back`,
        );
      }
      if (input.mode !== "store_back" && pallet.status === "retrieved") {
        throw new HttpError(409, `Pallet ${palletId} is already retrieved`);
      }
    }

    const active = await client.query(
      `SELECT pp.pallet_id
       FROM process_pallets pp
       JOIN process_runs pr ON pr.id = pp.run_id
       WHERE pp.pallet_id = ANY($1::varchar[])
         AND pp.status IN ('pending', 'running')
         AND pr.status IN ('running', 'error')`,
      [input.palletIds],
    );
    if ((active.rowCount ?? 0) > 0) {
      throw new HttpError(409, "A pallet is already in an active process run");
    }

    let runId: number;
    try {
      const run = await client.query<{ id: number }>(
        `INSERT INTO process_runs
           (mode, event_id, venue, requested_agv_id,
            current_pallet_id, actor)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          input.mode,
          input.eventId,
          input.venue,
          input.requestedAgvId,
          input.palletIds[0],
          input.actor,
        ],
      );
      runId = run.rows[0]!.id;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new HttpError(409, "Another process run is already active");
      }
      throw error;
    }

    for (const [sequence, palletId] of input.palletIds.entries()) {
      const pallet = byId.get(palletId)!;
      await client.query(
        `INSERT INTO process_pallets
           (run_id, pallet_id, sequence_index, status, current_step,
            original_cell, original_level, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          runId,
          palletId,
          sequence,
          sequence === 0 ? "running" : "pending",
          sequence === 0 ? firstProcessStep(input.mode) : null,
          `L${pallet.level}-R${pallet.rowNumber}-S${pallet.slotNumber}`,
          pallet.level,
          sequence === 0 ? new Date() : null,
        ],
      );
    }

    await log(
      {
        level: "info",
        category: "audit",
        source: "process",
        actor: input.actor,
        eventId: input.eventId ?? undefined,
        message: "Process run started",
        details: {
          runId,
          mode: input.mode,
          palletIds: input.palletIds,
          simulation: true,
        },
      },
      client,
    );
    return loadRun(client, runId);
  });
}

export async function findProcessRun(runId: number): Promise<ProcessRun> {
  const client = await pool.connect();
  try {
    return await loadRun(client, runId);
  } finally {
    client.release();
  }
}

export async function findProcessRuns(): Promise<ProcessRun[]> {
  const result = await pool.query<{ id: number }>(
    "SELECT id FROM process_runs ORDER BY created_at DESC, id DESC",
  );
  return Promise.all(result.rows.map(({ id }) => findProcessRun(id)));
}

export async function advanceProcessRunTransaction(
  runId: number,
  actor: string,
  performStep: (
    run: ProcessRun,
    pallet: ProcessPallet,
    client: PoolClient,
  ) => Promise<{ agvId?: string }>,
): Promise<ProcessRun> {
  return transaction(async (client) => {
    const run = await loadRun(client, runId, true);
    if (run.status !== "running") {
      throw new HttpError(409, "Only a running process can continue");
    }
    const pallet = run.pallets.find(
      (item) => item.palletId === run.currentPalletId,
    );
    if (!pallet || pallet.status !== "running" || !pallet.currentStep) {
      throw new HttpError(409, "Process has no active pallet step");
    }

    const result = await performStep(run, pallet, client);
    const completedStep = pallet.currentStep;
    const nextStep = nextProcessStep(run.mode, completedStep);
    if (nextStep) {
      await client.query(
        `UPDATE process_pallets
         SET current_step = $1, agv_id = COALESCE($2, agv_id),
             updated_at = CURRENT_TIMESTAMP
         WHERE run_id = $3 AND pallet_id = $4`,
        [nextStep, result.agvId ?? null, runId, pallet.palletId],
      );
    } else {
      await completePallet(client, run, pallet, result.agvId);
    }

    await log(
      {
        level: "info",
        category: "process",
        source: "process",
        actor,
        palletId: pallet.palletId,
        eventId: run.eventId ?? undefined,
        message: `Process step completed: ${completedStep}`,
        details: {
          runId,
          mode: run.mode,
          step: completedStep,
          simulation: true,
        },
      },
      client,
    );
    return loadRun(client, runId);
  });
}

async function completePallet(
  client: PoolClient,
  run: ProcessRun,
  pallet: ProcessPallet,
  agvId?: string,
): Promise<void> {
  await client.query(
    `UPDATE process_pallets
     SET status = 'completed', current_step = NULL,
         agv_id = COALESCE($1, agv_id),
         completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE run_id = $2 AND pallet_id = $3`,
    [agvId ?? null, run.id, pallet.palletId],
  );
  await client.query(
    `UPDATE pallets SET status = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [run.mode === "store_back" ? "post-event" : "retrieved", pallet.palletId],
  );

  const next = await client.query<{ palletId: string }>(
    `SELECT pallet_id AS "palletId" FROM process_pallets
     WHERE run_id = $1 AND status = 'pending'
     ORDER BY sequence_index LIMIT 1`,
    [run.id],
  );
  const nextPalletId = next.rows[0]?.palletId ?? null;
  if (nextPalletId) {
    await client.query(
      `UPDATE process_pallets
       SET status = 'running', current_step = $1,
           started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE run_id = $2 AND pallet_id = $3`,
      [firstProcessStep(run.mode), run.id, nextPalletId],
    );
    await client.query(
      `UPDATE process_runs SET current_pallet_id = $1,
              updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [nextPalletId, run.id],
    );
  } else {
    await client.query(
      `UPDATE process_runs
       SET status = 'completed', current_pallet_id = NULL,
           completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [run.id],
    );
    await releaseProcessAgvs(client, run.id);
  }
}

export async function stopProcessRunTransaction(
  runId: number,
  actor: string,
): Promise<ProcessRun> {
  return transaction(async (client) => {
    const run = await loadRun(client, runId, true);
    if (run.status !== "running" && run.status !== "error") {
      throw new HttpError(
        409,
        "Only a running or errored process can be stopped",
      );
    }
    await client.query(
      `UPDATE process_runs SET status = 'stopped',
              updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [runId],
    );
    await releaseProcessAgvs(client, runId);
    if (run.currentPalletId) {
      await client.query(
        `UPDATE process_pallets SET status = 'stopped',
                updated_at = CURRENT_TIMESTAMP
         WHERE run_id = $1 AND pallet_id = $2 AND status = 'running'`,
        [runId, run.currentPalletId],
      );
    }
    await log(
      {
        level: "warn",
        category: "audit",
        source: "process",
        actor,
        eventId: run.eventId ?? undefined,
        message: "Process run stopped",
        details: { runId, simulation: true },
      },
      client,
    );
    return loadRun(client, runId);
  });
}

export async function reportRunErrorTransaction(
  runId: number,
  message: string,
  actor: string,
): Promise<ProcessRun> {
  return transaction(async (client) => {
    const run = await loadRun(client, runId, true);
    if (run.status !== "running") {
      throw new HttpError(409, "Only a running process can enter error state");
    }
    await client.query(
      `UPDATE process_runs SET status = 'error', error_message = $1,
              updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [message, runId],
    );
    await log(
      {
        level: "error",
        category: "process",
        source: "process",
        actor,
        palletId: run.currentPalletId ?? undefined,
        eventId: run.eventId ?? undefined,
        message: "Process run entered error state",
        details: { runId, error: message, simulation: true },
      },
      client,
    );
    return loadRun(client, runId);
  });
}

export async function reportPalletErrorTransaction(
  runId: number,
  palletId: string,
  message: string,
  actor: string,
): Promise<ProcessRun> {
  return transaction(async (client) => {
    const run = await loadRun(client, runId, true);
    if (run.status !== "running" || run.currentPalletId !== palletId) {
      throw new HttpError(
        409,
        "Only the active pallet can be skipped after an error",
      );
    }
    await client.query(
      `UPDATE process_pallets
       SET status = 'error', error_message = $1, current_step = NULL,
           completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE run_id = $2 AND pallet_id = $3`,
      [message, runId, palletId],
    );

    const next = await client.query<{ palletId: string }>(
      `SELECT pallet_id AS "palletId" FROM process_pallets
       WHERE run_id = $1 AND status = 'pending'
       ORDER BY sequence_index LIMIT 1`,
      [runId],
    );
    const nextPalletId = next.rows[0]?.palletId ?? null;
    if (nextPalletId) {
      await client.query(
        `UPDATE process_pallets
         SET status = 'running', current_step = $1,
             started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE run_id = $2 AND pallet_id = $3`,
        [firstProcessStep(run.mode), runId, nextPalletId],
      );
      await client.query(
        `UPDATE process_runs SET current_pallet_id = $1,
                updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [nextPalletId, runId],
      );
    } else {
      await client.query(
        `UPDATE process_runs
         SET status = 'completed', current_pallet_id = NULL,
             completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [runId],
      );
      await releaseProcessAgvs(client, runId);
    }

    await log(
      {
        level: "error",
        category: "process",
        source: "process",
        actor,
        palletId,
        eventId: run.eventId ?? undefined,
        message: "Pallet skipped after process error",
        details: { runId, error: message, nextPalletId, simulation: true },
      },
      client,
    );
    return loadRun(client, runId);
  });
}

export async function resumeProcessRunTransaction(
  runId: number,
  actor: string,
): Promise<ProcessRun> {
  return transaction(async (client) => {
    const run = await loadRun(client, runId, true);
    if (run.status !== "error") {
      throw new HttpError(409, "Only an errored process can be resumed");
    }
    await client.query(
      `UPDATE process_runs SET status = 'running', error_message = NULL,
              updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [runId],
    );
    await log(
      {
        level: "info",
        category: "audit",
        source: "process",
        actor,
        palletId: run.currentPalletId ?? undefined,
        eventId: run.eventId ?? undefined,
        message: "Process run resumed",
        details: { runId, simulation: true },
      },
      client,
    );
    return loadRun(client, runId);
  });
}
