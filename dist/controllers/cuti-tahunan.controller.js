import { z } from 'zod';
import { cutiTahunanAgent } from '../agents/cuti-tahunan.agent.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { getCurrentYear } from '../utils/date.js';
// Validation schemas
const generateCutiTahunanSchema = z.object({
    tahun: z.number().int().optional(),
    karyawanId: z.string().uuid().optional(),
});
/**
 * CutiTahunanController - API handlers untuk manajemen cuti tahunan
 */
export class CutiTahunanController {
    /**
     * POST /api/cuti-tahunan/generate - Generate hak cuti tahunan
     */
    async generate(req, res, next) {
        try {
            logger.info('CutiTahunanController: Generate cuti tahunan request', { body: req.body });
            // Validasi input
            const validatedData = generateCutiTahunanSchema.parse(req.body);
            const tahun = validatedData.tahun || getCurrentYear();
            let result;
            if (validatedData.karyawanId) {
                // Generate untuk satu karyawan
                result = await cutiTahunanAgent.generateCutiTahunan(validatedData.karyawanId, tahun);
            }
            else {
                // Generate untuk semua karyawan aktif
                result = await cutiTahunanAgent.generateCutiTahunanBulk(tahun);
            }
            // Send response
            res.status(201).json(successResponse('Cuti tahunan berhasil digenerate', result));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/cuti-tahunan - Get rekap cuti tahunan
     */
    async getRekap(req, res, next) {
        try {
            logger.info('CutiTahunanController: Get rekap cuti tahunan', { query: req.query });
            const tahun = req.query.tahun ? parseInt(req.query.tahun) : undefined;
            const karyawanId = req.query.karyawanId;
            const page = req.query.page ? parseInt(req.query.page) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit) : 20;
            // Call agent
            const result = await cutiTahunanAgent.getRekapCutiTahunan(tahun, karyawanId, page, limit);
            // Send response
            res.json(paginatedResponse('Rekap cuti tahunan berhasil diambil', result.data, result.pagination));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/cuti-tahunan/:id - Get detail cuti tahunan by ID
     */
    async findById(req, res, next) {
        try {
            const { id } = req.params;
            logger.info('CutiTahunanController: Get cuti tahunan by ID', { id });
            // Call agent
            const cutiTahunan = await cutiTahunanAgent.findById(id);
            // Send response
            res.json(successResponse('Data cuti tahunan berhasil diambil', cutiTahunan));
        }
        catch (error) {
            next(error);
        }
    }
}
// Export singleton instance
export const cutiTahunanController = new CutiTahunanController();
