import { HttpError } from "../../shared/errors.js";
import type { Request, Response, NextFunction } from "express";

import {
  getAllAgvs,
  getAgvById,
  dispatchAgv,
  completeAgv,
  updateAgvBattery,
  setAgvCharging,
  updateAgvHeartbeat,
  setAgvError,
  recoverAgv,
} from "./agv.service.js";

export async function getAgvStatusController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agvs = await getAllAgvs();

    res.status(200).json({
      success: true,
      data: agvs,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAgvByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = String(req.params.id ?? "");
    const agv = await getAgvById(id);

    if (!agv) {
      res.status(404).json({
        success: false,
        message: "AGV not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: agv,
    });
  } catch (error) {
    next(error);
  }
}


export async function autoDispatchController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { palletId, actor } = req.body ?? {};

    const agv = await dispatchAgv({
      palletId,
      actor,
    });

    res.status(200).json({
      success: true,
      message: "AGV automatically dispatched",
      data: agv,
    });
  } catch (error) {
    next(error);
  }
}

export async function manualDispatchController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { palletId, actor, agvId } = req.body ?? {};

    if (typeof agvId !== "string" || !agvId.trim()) {
      throw new HttpError(400, "agvId is required");
    }

    const agv = await dispatchAgv({
      palletId,
      actor,
      agvId,
    });

    res.status(200).json({
      success: true,
      message: "AGV manually dispatched",
      data: agv,
    });
  } catch (error) {
    next(error);
  }
}



export async function completeAgvController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { agvId, actor } = req.body ?? {};

    const agv = await completeAgv(agvId, actor);

    res.status(200).json({
      success: true,
      message: "AGV delivery completed successfully",
      data: agv,
    });
  } catch (error) {
    next(error);
  }
}


export async function updateAgvBatteryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { agvId, batteryLevel, actor } = req.body ?? {};
    const agv = await updateAgvBattery(agvId, batteryLevel, actor);

    res.json({
      success: true,
      message: "AGV battery updated",
      data: agv,
    });
  } catch (error) {
    next(error);
  }
}

export async function setAgvChargingController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { agvId, charging, actor } = req.body ?? {};
    const agv = await setAgvCharging(agvId, charging, actor);

    res.json({
      success: true,
      message: charging ? "AGV charging started" : "AGV charging stopped",
      data: agv,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAgvHeartbeatController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { agvId } = req.body ?? {};
    const agv = await updateAgvHeartbeat(agvId);

    res.json({
      success: true,
      message: "AGV heartbeat received",
      data: agv,
    });
  } catch (error) {
    next(error);
  }
}

export async function setAgvErrorController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { agvId, reason, actor } = req.body ?? {};
    const agv = await setAgvError(agvId, reason, actor);

    res.json({
      success: true,
      message: "AGV entered error state",
      data: agv,
    });
  } catch (error) {
    next(error);
  }
}

export async function recoverAgvController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { agvId, actor } = req.body ?? {};
    const agv = await recoverAgv(agvId, actor);

    res.json({
      success: true,
      message: "AGV recovered successfully",
      data: agv,
    });
  } catch (error) {
    next(error);
  }
}
