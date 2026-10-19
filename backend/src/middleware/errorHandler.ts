import type { ErrorRequestHandler } from "express";
import { HttpError } from "../shared/errors.js";
import { log } from "../shared/logger.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request,
  response,
  _next,
) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: {
        message: error.message,
      },
    });
    return;
  }

  void log({
    level: "error",
    category: "system",
    source: "errorHandler",
    actor: "system",
    message:
      error instanceof Error ? error.message : "Unknown server error",
    details: {
      method: request.method,
      path: request.originalUrl,
      stack: error instanceof Error ? error.stack : undefined,
    },
  }).catch((loggingError: unknown) => {
    console.error("Failed to save unexpected error log:", loggingError);
  });

  response.status(500).json({
    error: {
      message: "Internal server error",
    },
  });
};