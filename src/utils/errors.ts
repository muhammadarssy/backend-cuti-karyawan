import { logger } from './logger.js';

/**
 * Custom Application Errors
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, 'VALIDATION_ERROR', details);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message, 'NOT_FOUND');
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

/**
 * Business Logic Error (422)
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, message, 'BUSINESS_LOGIC_ERROR', details);
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Terjadi kesalahan pada server') {
    super(500, message, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * Error Logger Helper
 */
export function logError(error: Error, context?: string): void {
  if (error instanceof AppError) {
    logger.error(`[${context || 'APP_ERROR'}] ${error.message}`, {
      statusCode: error.statusCode,
      code: error.code,
      details: error.details,
      stack: error.stack,
    });
  } else {
    logger.error(`[${context || 'UNKNOWN_ERROR'}] ${error.message}`, {
      stack: error.stack,
    });
  }
}
