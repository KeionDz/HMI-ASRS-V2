import { HttpError } from "../../shared/errors.js";

export function parseIdentifier(value: string, name: string): string {
  const identifier = value.trim();

  if (identifier.length === 0 || identifier.length > 50) {
    throw new HttpError(400, `${name} must contain 1 to 50 characters`);
  }

  if (!/^[A-Za-z0-9._-]+$/.test(identifier)) {
    throw new HttpError(
      400,
      `${name} may only contain letters, numbers, dots, underscores, and hyphens`,
    );
  }

  return identifier;
}

export function parsePositiveInteger(value: string, name: string): number {
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    throw new HttpError(400, `${name} must be a positive integer`);
  }

  return Number(value);
}

export function parseChecklistQuantity(body: unknown): number {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "request body must be a JSON object");
  }

  const requiredQuantity = (body as Record<string, unknown>).requiredQuantity;

  if (!Number.isInteger(requiredQuantity) || (requiredQuantity as number) < 1) {
    throw new HttpError(400, "requiredQuantity must be a positive integer");
  }

  return requiredQuantity as number;
}
