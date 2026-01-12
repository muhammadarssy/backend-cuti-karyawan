/**
 * Standard API Response Format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Error Response Format
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: {
    code: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Success Response Builder
 */
export function successResponse<T>(
  message: string,
  data?: T,
  requestId?: string
): ApiResponse<T> {
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
export function errorResponse(
  message: string,
  errorCode?: string,
  details?: unknown,
  requestId?: string
): ApiErrorResponse {
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
 * Pagination Meta
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

/**
 * Paginated Response Builder
 */
export function paginatedResponse<T>(
  message: string,
  data: T[],
  pagination: PaginationMeta,
  requestId?: string
): PaginatedResponse<T> {
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
