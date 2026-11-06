import { HttpError } from "../../shared/errors.js";
import type {
  ProcessButtons,
  ProcessMode,
  ProcessStatus,
  ProcessStep,
} from "./process.types.js";

const STEPS: Record<ProcessMode, readonly ProcessStep[]> = {
  retrieve_to_venue: [
    "profile_requested",
    "agv_dispatched",
    "lift_up",
    "shutter_open",
    "asrs_retrieve",
    "venue_delivery",
  ],
  retrieve_with_robot: [
    "profile_requested",
    "agv_dispatched",
    "lift_up",
    "shutter_open",
    "asrs_retrieve",
  ],
  store_back: [
    "profile_requested",
    "agv_dispatched",
    "lift_down",
    "shutter_open",
    "asrs_store",
  ],
};

export function firstProcessStep(mode: ProcessMode): ProcessStep {
  return STEPS[mode][0]!;
}

export function nextProcessStep(
  mode: ProcessMode,
  currentStep: ProcessStep,
): ProcessStep | null {
  const steps = STEPS[mode];
  const index = steps.indexOf(currentStep);

  if (index < 0) {
    throw new HttpError(409, `Invalid step ${currentStep} for ${mode}`);
  }

  return steps[index + 1] ?? null;
}

export function processButtons(status: ProcessStatus): ProcessButtons {
  return {
    continue: status === "running",
    stop: status === "running" || status === "error",
    reportRunError: status === "running",
    reportPalletError: status === "running",
    resume: status === "error",
  };
}

export const PROCESS_BUTTON_MATRIX = ([
  "running",
  "error",
  "stopped",
  "completed",
] as const).map((status) => ({ status, ...processButtons(status) }));
