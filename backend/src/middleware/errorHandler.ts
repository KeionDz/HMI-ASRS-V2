import type { ErrorRequestHandler } from "express";
import { HttpError } from "../shared/errors.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next
) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: {
        message: error.message,
      },
    });
    return;
  }

  // Allain will connect the shared logger here.
  response.status(500).json({
    error: {
      message: "Internal server error",
    },
  });
};