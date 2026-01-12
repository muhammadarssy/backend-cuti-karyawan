/**
 * Success Response Builder
 */
export function successResponse(message, data, requestId) {
    return {
        success: true,
        message,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            requestId,
        },
    };
}
/**
 * Error Response Builder
 */
export function errorResponse(message, errorCode, details, requestId) {
    return {
        success: false,
        message,
        error: errorCode
            ? {
                code: errorCode,
                details,
            }
            : undefined,
        meta: {
            timestamp: new Date().toISOString(),
            requestId,
        },
    };
}
/**
 * Paginated Response Builder
 */
export function paginatedResponse(message, data, pagination, requestId) {
    return {
        success: true,
        message,
        data,
        pagination,
        meta: {
            timestamp: new Date().toISOString(),
            requestId,
        },
    };
}
