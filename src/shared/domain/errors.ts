import { StatusCodes } from 'http-status-codes';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown;
  constructor(message: string, details?: unknown) {
    super(message, StatusCodes.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      StatusCodes.NOT_FOUND,
      'NOT_FOUND',
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, StatusCodes.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, StatusCodes.CONFLICT, 'CONFLICT');
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor(from: string, to: string, entity: string) {
    super(
      `Invalid ${entity} status transition: '${from}' → '${to}'`,
      StatusCodes.UNPROCESSABLE_ENTITY,
      'INVALID_STATUS_TRANSITION',
    );
  }
}

export class IdempotencyConflictError extends AppError {
  constructor() {
    super('Duplicate request detected', StatusCodes.CONFLICT, 'IDEMPOTENCY_CONFLICT');
  }
}
