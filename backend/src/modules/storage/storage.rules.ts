import { HttpError } from "../../shared/errors.js";
import type { StoragePalletState } from "./storage.types.js";

export function validatePalletContentEdit(pallet: StoragePalletState): void {
  if (pallet.locked) {
    throw new HttpError(409, "pallet is locked");
  }
}
