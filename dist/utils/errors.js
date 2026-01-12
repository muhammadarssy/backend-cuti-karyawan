import { logger } from './logger.js';
/**
 * Custom Application Errors
 */
export class AppError extends Error {
    statusCode;
    message;
    code;
    details;
    constructor(statusCode, message, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.code = code;
        this.details = details;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
/**
 * Validation Error (400)
 */
export class ValidationError extends AppError {
    constructor(message, details) {
        super(400, message, 'VALIDATION_ERROR', details);
    }
}
/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
    constructor(message) {
        super(404, message, 'NOT_FOUND');
    }
}
/**
 * Conflict Error (409)
 */
export class ConflictError extends AppError {
    constructor(message) {
        super(409, message, 'CONFLICT');
    }
}
/**
 * Business Logic Error (422)
 */
export class BusinessLogicError extends AppError {
    constructor(message, details) {
        super(422, message, 'BUSINESS_LOGIC_ERROR', details);
    }
}
/**
 * Internal Server Error (500)
 */
export class InternalServerError extends AppError {
    constructor(message = 'Terjadi kesalahan pada server') {
        super(500, message, 'INTERNAL_SERVER_ERROR');
    }
}
/**
 * Error Logger Helper
 */
export function logError(error, context) {
    if (error instanceof AppError) {
        logger.error(`[${context || 'APP_ERROR'}] ${error.message}`, {
            statusCode: error.statusCode,
            code: error.code,
            details: error.details,
            stack: error.stack,
        });
    }
    else {
        logger.error(`[${context || 'UNKNOWN_ERROR'}] ${error.message}`, {
            stack: error.stack,
        });
    }
}
