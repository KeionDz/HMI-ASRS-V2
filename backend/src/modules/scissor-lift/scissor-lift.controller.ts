
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../../shared/errors.js";
import {
  getStatus,
  moveLift,
  stopLift,
  resumeLift,
  receiveLiftHeartbeat,
  checkLiftHeartbeat,
} from "./scissor-lift.service.js";

export async function getLiftStatus(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const state = await getStatus();
    response.json(state);
  } catch (error) {
    next(error);
  }
}

export async function moveLiftController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { direction, actor } = request.body ?? {};

    if (direction !== "up" && direction !== "down") {
      throw new HttpError(400, "Direction must be 'up' or 'down'");
    }

    if (actor !== undefined &&
        (typeof actor !== "string" || !actor.trim())) {
      throw new HttpError(400, "Actor must be a non-empty string");
    }

    const state = await moveLift(direction, actor ?? "operator");
    response.json(state);
  } catch (error) {
    next(error);
  }
}

export async function stopLiftController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const state = await stopLift("operator");
    response.json(state);
  } catch (error) {
    next(error);
  }
}

export async function resumeLiftController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const state = await resumeLift("operator");
    response.json(state);
  } catch (error) {
    next(error);
  }
}


export async function liftHeartbeatController(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const state = await receiveLiftHeartbeat();
    response.json(state);
  } catch (error) {
    next(error);
  }
}


export async function checkLiftHeartbeatController(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await checkLiftHeartbeat();
    response.json(result);
  } catch (error) {
    next(error);
  }
}
