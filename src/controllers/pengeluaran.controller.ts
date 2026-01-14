import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pengeluaranAgent } from '../agents/pengeluaran.agent.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

// Validation schemas
const createPengeluaranSchema = z.object({
  itemId: z.string().uuid('Item ID tidak valid'),
  jumlah: z.number().int().positive('Jumlah harus lebih dari 0'),
  tanggal: z.string().datetime('Format tanggal tidak valid'),
  keperluan: z.string().min(1, 'Keperluan wajib diisi'),
  penerima: z.string().optional(),
  keterangan: z.string().optional(),
});

const updatePengeluaranSchema = z.object({
  jumlah: z.number().int().positive('Jumlah harus lebih dari 0').optional(),
  tanggal: z.string().datetime('Format tanggal tidak valid').optional(),
  keperluan: z.string().min(1, 'Keperluan wajib diisi').optional(),
  penerima: z.string().optional(),
  keterangan: z.string().optional(),
});

/**
 * PengeluaranController - API handlers untuk manajemen transaksi pengeluaran
 */
export class PengeluaranController {
  /**
   * POST /api/pengeluaran - Create pengeluaran baru
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('PengeluaranController: Create pengeluaran request', { body: req.body });

      const validatedData = createPengeluaranSchema.parse(req.body);
      const pengeluaran = await pengeluaranAgent.create(validatedData);

      res.status(201).json(successResponse('Pengeluaran berhasil dicatat', pengeluaran));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pengeluaran - Get list pengeluaran
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('PengeluaranController: Get all pengeluaran', { query: req.query });

      const itemId = req.query.itemId as string | undefined;
      const kategori = req.query.kategori as 'ATK' | 'OBAT' | undefined;
      const keperluan = req.query.keperluan as string | undefined;
      const penerima = req.query.penerima as string | undefined;
      const tanggalMulai = req.query.tanggalMulai as string | undefined;
      const tanggalSelesai = req.query.tanggalSelesai as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const result = await pengeluaranAgent.findAll(
        itemId,
        kategori,
        keperluan,
        penerima,
        tanggalMulai,
        tanggalSelesai,
        page,
        limit
      );

      res.json(
        paginatedResponse('Data pengeluaran berhasil diambil', result.data, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pengeluaran/:id - Get pengeluaran by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('PengeluaranController: Get pengeluaran by ID', { id: req.params.id });

      const pengeluaran = await pengeluaranAgent.findById(req.params.id);

      res.json(successResponse('Data pengeluaran berhasil diambil', pengeluaran));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/pengeluaran/:id - Update pengeluaran
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('PengeluaranController: Update pengeluaran', {
        id: req.params.id,
        body: req.body,
      });

      const validatedData = updatePengeluaranSchema.parse(req.body);
      const pengeluaran = await pengeluaranAgent.update(req.params.id, validatedData);

      res.json(successResponse('Pengeluaran berhasil diupdate', pengeluaran));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/pengeluaran/:id - Delete pengeluaran
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('PengeluaranController: Delete pengeluaran', { id: req.params.id });

      const pengeluaran = await pengeluaranAgent.delete(req.params.id);

      res.json(successResponse('Pengeluaran berhasil dihapus', pengeluaran));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pengeluaran/rekap - Get rekap pengeluaran
   */
  async getRekapPengeluaran(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('PengeluaranController: Get rekap pengeluaran', { query: req.query });

      const kategori = req.query.kategori as 'ATK' | 'OBAT' | undefined;
      const tanggalMulai = req.query.tanggalMulai as string | undefined;
      const tanggalSelesai = req.query.tanggalSelesai as string | undefined;
      const groupBy =
        (req.query.groupBy as 'item' | 'keperluan' | 'penerima') || 'item';

      const rekap = await pengeluaranAgent.getRekapPengeluaran(
        kategori,
        tanggalMulai,
        tanggalSelesai,
        groupBy
      );

      res.json(successResponse('Rekap pengeluaran berhasil diambil', rekap));
    } catch (error) {
      next(error);
    }
  }
}

export const pengeluaranController = new PengeluaranController();
