import { ZodError } from 'zod';
import { AppError, logError } from '../utils/errors.js';
import { errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';
/**
 * Global Error Handler Middleware
 */
export function errorHandler(err, req, res, _next) {
    // Log error
    logError(err, 'ErrorHandler');
    // Handle Zod validation errors
    if (err instanceof ZodError) {
        const validationErrors = err.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
        }));
        logger.warn('Validation error occurred', {
            path: req.path,
            method: req.method,
            errors: validationErrors,
        });
        return res.status(400).json(errorResponse('Validasi gagal', 'VALIDATION_ERROR', validationErrors));
    }
    // Handle custom application errors
    if (err instanceof AppError) {
        logger.warn('Application error occurred', {
            path: req.path,
            method: req.method,
            statusCode: err.statusCode,
            code: err.code,
            message: err.message,
        });
        return res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
    }
    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prismaError = err;
        logger.warn('Prisma error occurred', {
            path: req.path,
            method: req.method,
            code: prismaError.code,
            meta: prismaError.meta,
        });
        if (prismaError.code === 'P2002') {
            return res.status(409).json(errorResponse('Data sudah ada (duplikat)', 'DUPLICATE_ERROR'));
        }
        if (prismaError.code === 'P2025') {
            return res.status(404).json(errorResponse('Data tidak ditemukan', 'NOT_FOUND'));
        }
    }
    // Default error response
    logger.error('Unhandled error occurred', {
        path: req.path,
        method: req.method,
        error: err.message,
        stack: err.stack,
        name: err.name,
    });
    return res
        .status(500)
        .json(errorResponse('Terjadi kesalahan pada server', 'INTERNAL_SERVER_ERROR'));
}
/**
 * 404 Not Found Handler
 */
export function notFoundHandler(req, res) {
    logger.warn('Route not found', { method: req.method, path: req.path });
    res.status(404).json(errorResponse(`Route ${req.method} ${req.path} tidak ditemukan`, 'NOT_FOUND'));
}
