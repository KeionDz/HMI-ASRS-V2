import type { Request, Response, NextFunction } from "express";
import { assetsService } from "./assets.service.js";

function handle(fn: (req: Request) => Promise<unknown>, status = 200) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.status(status).json({ success: true, data: await fn(req) }); }
    catch (error) { next(error); }
  };
}
export const listAssetsController = handle(() => assetsService.list());
export const getAssetController = handle((req) => assetsService.get(req.params.id));
export const registerAssetController = handle((req) => assetsService.register(req.body), 201);
export const ingestAssetController = handle((req) => assetsService.ingest(req.body, "simulation"));
export const assetEventsController = handle((req) => assetsService.events(req.params.id));
export const assetSummaryController = handle(() => assetsService.summary());
