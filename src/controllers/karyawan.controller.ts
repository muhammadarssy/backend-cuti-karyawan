import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { karyawanAgent } from '../agents/karyawan.agent.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

// Validation schemas
const createKaryawanSchema = z.object({
  nik: z.string().min(1, 'NIK wajib diisi'),
  fingerprintId: z.number().int().positive().optional(),
  nama: z.string().min(1, 'Nama wajib diisi'),
  jabatan: z.string().optional(),
  departemen: z.enum(['SECURITY', 'STAFF']).optional(),
  tanggalMasuk: z.string().datetime('Format tanggal tidak valid').optional(),
  tanggal_bergabung: z.string().datetime('Format tanggal tidak valid').optional(),
}).refine((data) => data.tanggalMasuk || data.tanggal_bergabung, {
  message: 'Tanggal masuk atau tanggal bergabung wajib diisi',
  path: ['tanggal_bergabung'],
});

const updateKaryawanSchema = z.object({
  fingerprintId: z.number().int().positive().optional(),
  nama: z.string().min(1).optional(),
  jabatan: z.string().optional(),
  departemen: z.enum(['SECURITY', 'STAFF']).optional(),
  tanggalMasuk: z.string().datetime().optional(),
  tanggal_bergabung: z.string().datetime().optional(),
  status: z.enum(['AKTIF', 'NONAKTIF']).optional(),
});

/**
 * KaryawanController - API handlers untuk manajemen karyawan
 */
export class KaryawanController {
  /**
   * POST /api/karyawan - Create new karyawan
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('KaryawanController: Create karyawan request', { body: req.body });

      // Validasi input
      const validatedData = createKaryawanSchema.parse(req.body);

      // Map tanggal_bergabung to tanggalMasuk for agent
      const tanggalMasuk = validatedData.tanggal_bergabung || validatedData.tanggalMasuk;

      // Call agent
      const karyawan = await karyawanAgent.create({
        nik: validatedData.nik,
        fingerprintId: validatedData.fingerprintId,
        nama: validatedData.nama,
        jabatan: validatedData.jabatan,
        departemen: validatedData.departemen,
        tanggalMasuk: new Date(tanggalMasuk!),
      });

      // Send response
      res.status(201).json(successResponse('Karyawan berhasil ditambahkan', karyawan));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/karyawan - Get all karyawan
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('KaryawanController: Get all karyawan request', { query: req.query });

      const { status } = req.query;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      // Validasi status jika ada
      const validStatus =
        status && (status === 'AKTIF' || status === 'NONAKTIF') ? status : undefined;

      // Call agent
      const result = await karyawanAgent.findAll(validStatus, page, limit);

      // Send response
      res.json(paginatedResponse('Data karyawan berhasil diambil', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/karyawan/:id - Get karyawan by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info('KaryawanController: Get karyawan by ID', { id });

      // Call agent
      const karyawan = await karyawanAgent.findById(id);

      // Send response
      res.json(successResponse('Data karyawan berhasil diambil', karyawan));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/karyawan/:id - Update karyawan
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info('KaryawanController: Update karyawan', { id, body: req.body });

      // Validasi input
      const validatedData = updateKaryawanSchema.parse(req.body);

      // Call agent
      const karyawan = await karyawanAgent.update(id, {
        ...validatedData,
        tanggalMasuk: validatedData.tanggalMasuk
          ? new Date(validatedData.tanggalMasuk)
          : undefined,
      });

      // Send response
      res.json(successResponse('Data karyawan berhasil diupdate', karyawan));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/karyawan/:id - Deactivate karyawan
   */
  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info('KaryawanController: Deactivate karyawan', { id });

      // Call agent
      const karyawan = await karyawanAgent.deactivate(id);

      // Send response
      res.json(successResponse('Karyawan berhasil dinonaktifkan', karyawan));
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const karyawanController = new KaryawanController();
