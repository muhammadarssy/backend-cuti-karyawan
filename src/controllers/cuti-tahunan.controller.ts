import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { cutiTahunanAgent } from '../agents/cuti-tahunan.agent.js';
import { successResponse } from '../utils/response.js';
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
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('CutiTahunanController: Generate cuti tahunan request', { body: req.body });

      // Validasi input
      const validatedData = generateCutiTahunanSchema.parse(req.body);

      const tahun = validatedData.tahun || getCurrentYear();

      let result;

      if (validatedData.karyawanId) {
        // Generate untuk satu karyawan
        result = await cutiTahunanAgent.generateCutiTahunan(validatedData.karyawanId, tahun);
      } else {
        // Generate untuk semua karyawan aktif
        result = await cutiTahunanAgent.generateCutiTahunanBulk(tahun);
      }

      // Send response
      res.status(201).json(successResponse('Cuti tahunan berhasil digenerate', result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/cuti-tahunan - Get rekap cuti tahunan
   */
  async getRekap(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('CutiTahunanController: Get rekap cuti tahunan', { query: req.query });

      const tahun = req.query.tahun ? parseInt(req.query.tahun as string) : undefined;
      const karyawanId = req.query.karyawanId as string | undefined;

      // Call agent
      const rekap = await cutiTahunanAgent.getRekapCutiTahunan(tahun, karyawanId);

      // Send response
      res.json(successResponse('Rekap cuti tahunan berhasil diambil', rekap));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/cuti-tahunan/:id - Get detail cuti tahunan by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info('CutiTahunanController: Get cuti tahunan by ID', { id });

      // Call agent
      const cutiTahunan = await cutiTahunanAgent.findById(id);

      // Send response
      res.json(successResponse('Data cuti tahunan berhasil diambil', cutiTahunan));
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const cutiTahunanController = new CutiTahunanController();
