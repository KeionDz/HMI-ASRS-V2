import { HttpError } from "../../shared/errors.js";
import type { StoragePalletState } from "./storage.types.js";

export function validatePalletContentEdit(pallet: StoragePalletState): void {
  if (pallet.locked) {
    throw new HttpError(409, "pallet is locked");
  }
}

export function validatePalletUnlock(
  pallet: StoragePalletState,
  actor: string,
  adminOverride: boolean,
): void {
  if (!pallet.locked || adminOverride) return;

  if (pallet.lockedBy !== null && pallet.lockedBy !== actor) {
    throw new HttpError(403, "only the lock owner or an admin can unlock pallet");
  }
}
