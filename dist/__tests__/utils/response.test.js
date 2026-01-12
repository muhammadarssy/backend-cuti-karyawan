import { describe, it, expect } from '@jest/globals';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response.js';
describe('Response Utils', () => {
    describe('successResponse', () => {
        it('should create success response', () => {
            const response = successResponse('Test success', { id: 1 });
            expect(response.success).toBe(true);
            expect(response.message).toBe('Test success');
            expect(response.data).toEqual({ id: 1 });
            expect(response.meta).toBeDefined();
            expect(response.meta?.timestamp).toBeDefined();
        });
        it('should work without data', () => {
            const response = successResponse('Test success');
            expect(response.success).toBe(true);
            expect(response.data).toBeUndefined();
        });
    });
    describe('errorResponse', () => {
        it('should create error response', () => {
            const response = errorResponse('Test error', 'ERROR_CODE', { detail: 'test' });
            expect(response.success).toBe(false);
            expect(response.message).toBe('Test error');
            expect(response.error?.code).toBe('ERROR_CODE');
            expect(response.error?.details).toEqual({ detail: 'test' });
            expect(response.meta.timestamp).toBeDefined();
        });
        it('should work without error code', () => {
            const response = errorResponse('Test error');
            expect(response.success).toBe(false);
            expect(response.error).toBeUndefined();
        });
    });
    describe('paginatedResponse', () => {
        it('should create paginated response', () => {
            const data = [{ id: 1 }, { id: 2 }];
            const pagination = {
                page: 1,
                limit: 20,
                total: 2,
                totalPages: 1,
            };
            const response = paginatedResponse('Test list', data, pagination);
            expect(response.success).toBe(true);
            expect(response.data).toEqual(data);
            expect(response.pagination).toEqual(pagination);
        });
    });
});
