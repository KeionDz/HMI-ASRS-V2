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
