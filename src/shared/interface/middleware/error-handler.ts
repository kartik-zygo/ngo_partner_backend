import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import {
  AppError,
  ValidationError,
} from '../../domain/errors';
import { logger } from '../../infrastructure/logger';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const correlationId = req.correlationId ?? 'unknown';

  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      correlationId,
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, correlationId }, 'Operational error');
    }
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
      correlationId,
    });
    return;
  }

  // Unexpected / programming errors — do not leak details in production
  logger.error({ err, correlationId }, 'Unexpected error');
  const message =
    process.env['NODE_ENV'] === 'production'
      ? 'An unexpected error occurred'
      : (err instanceof Error ? err.message : String(err));

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
    },
    correlationId,
  });
}
