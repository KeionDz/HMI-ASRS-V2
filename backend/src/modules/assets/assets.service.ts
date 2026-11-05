import { getAsset, getAssetEvents, getAssetSummary, ingestReading, listAssets, registerAsset } from "./assets.repository.js";
import { parseAssetId, parseReading, parseRegistration } from "./assets.schema.js";

export const assetsService = {
  list: listAssets,
  get: (id: unknown) => getAsset(parseAssetId(id)),
  register: (body: unknown) => registerAsset(parseRegistration(body)),
  ingest: (body: unknown, actor = "simulation") => ingestReading(parseReading(body), actor),
  events: (id: unknown) => getAssetEvents(parseAssetId(id)),
  summary: getAssetSummary,
};
