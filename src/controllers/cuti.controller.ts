import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { cutiAgent } from '../agents/cuti.agent.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

// Validation schemas
const createCutiSchema = z.object({
  karyawanId: z.string().uuid('Karyawan ID tidak valid'),
  jenis: z.enum(['TAHUNAN', 'SAKIT', 'IZIN', 'BAKU', 'TANPA_KETERANGAN', 'LAINNYA']),
  alasan: z.string().min(1, 'Alasan wajib diisi'),
  tanggalMulai: z.string().datetime('Format tanggal mulai tidak valid'),
  tanggalSelesai: z.string().datetime('Format tanggal selesai tidak valid'),
});

const updateCutiSchema = z.object({
  jenis: z.enum(['TAHUNAN', 'SAKIT', 'IZIN', 'BAKU', 'TANPA_KETERANGAN', 'LAINNYA']).optional(),
  alasan: z.string().min(1, 'Alasan wajib diisi').optional(),
  tanggalMulai: z.string().datetime('Format tanggal mulai tidak valid').optional(),
  tanggalSelesai: z.string().datetime('Format tanggal selesai tidak valid').optional(),
});

/**
 * CutiController - API handlers untuk manajemen transaksi cuti
 */
export class CutiController {
  /**
   * POST /api/cuti - Create/record cuti baru
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('CutiController: Create cuti request', { body: req.body });

      // Validasi input
      const validatedData = createCutiSchema.parse(req.body);

      // Call agent
      const cuti = await cutiAgent.create(validatedData);

      // Send response
      res.status(201).json(successResponse('Cuti berhasil dicatat', cuti));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/cuti/:id - Update cuti
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info('CutiController: Update cuti request', { id, body: req.body });

      // Validasi input
      const validatedData = updateCutiSchema.parse(req.body);

      // Call agent
      const cuti = await cutiAgent.update(id, validatedData);

      // Send response
      res.json(successResponse('Cuti berhasil diupdate', cuti));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/cuti/:id - Delete/rollback cuti
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info('CutiController: Delete cuti', { id });

      // Call agent
      const cuti = await cutiAgent.delete(id);

      // Send response
      res.json(successResponse('Cuti berhasil dihapus dan saldo dikembalikan', cuti));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/cuti/:id - Get cuti by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info('CutiController: Get cuti by ID', { id });

      // Call agent
      const cuti = await cutiAgent.findById(id);

      // Send response
      res.json(successResponse('Data cuti berhasil diambil', cuti));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/cuti - Get list cuti dengan filter dan pagination
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('CutiController: Get all cuti', { query: req.query });

      const karyawanId = req.query.karyawanId as string | undefined;
      const jenis = req.query.jenis as 'TAHUNAN' | 'SAKIT' | 'IZIN' | 'LAINNYA' | undefined;
      const tahun = req.query.tahun ? parseInt(req.query.tahun as string) : undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      // Call agent
      const result = await cutiAgent.findAll(karyawanId, jenis, tahun, page, limit);

      // Send response
      res.json(
        paginatedResponse('Data cuti berhasil diambil', result.data, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/cuti/rekap/alasan - Get rekap alasan cuti
   */
  async getRekapAlasan(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('CutiController: Get rekap alasan', { query: req.query });

      const tahun = req.query.tahun ? parseInt(req.query.tahun as string) : undefined;

      // Call agent
      const rekap = await cutiAgent.getRekapAlasanCuti(tahun);

      // Send response
      res.json(successResponse('Rekap alasan cuti berhasil diambil', rekap));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/cuti/summary/:karyawanId - Get summary cuti by karyawan
   */
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { karyawanId } = req.params;
      const tahun = req.query.tahun ? parseInt(req.query.tahun as string) : undefined;

      logger.info('CutiController: Get summary by karyawan', { karyawanId, tahun });

      // Call agent
      const summary = await cutiAgent.getSummaryByKaryawan(karyawanId, tahun);

      // Send response
      res.json(successResponse('Summary cuti berhasil diambil', summary));
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const cutiController = new CutiController();
