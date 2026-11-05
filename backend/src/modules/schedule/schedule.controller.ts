import type {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  cancelSchedule,
} from "./schedule.service.js";

export async function listSchedulesController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({
      success: true,
      data: await listSchedules(),
    });
  } catch (error) {
    next(error);
  }
}

export async function getScheduleController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({
      success: true,
      data: await getSchedule(req.params.id),
    });
  } catch (error) {
    next(error);
  }
}

export async function createScheduleController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const schedule = await createSchedule(req.body);

    res.status(201).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateScheduleController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({
      success: true,
      data: await updateSchedule(req.params.id, req.body),
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelScheduleController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({
      success: true,
      data: await cancelSchedule(req.params.id, req.body),
    });
  } catch (error) {
    next(error);
  }
}