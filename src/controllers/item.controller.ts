import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { itemAgent } from '../agents/item.agent.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

// Validation schemas
const createItemSchema = z.object({
  kode: z.string().min(1, 'Kode wajib diisi'),
  nama: z.string().min(1, 'Nama wajib diisi'),
  kategori: z.enum(['ATK', 'OBAT'], { message: 'Kategori harus ATK atau OBAT' }),
  satuan: z.string().min(1, 'Satuan wajib diisi'),
  stokMinimal: z.number().int().min(0).optional(),
  stokSekarang: z.number().int().min(0).optional(),
  keterangan: z.string().optional(),
});

const updateItemSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi').optional(),
  satuan: z.string().min(1, 'Satuan wajib diisi').optional(),
  stokMinimal: z.number().int().min(0).optional(),
  keterangan: z.string().optional(),
});

/**
 * ItemController - API handlers untuk manajemen master data item
 */
export class ItemController {
  /**
   * POST /api/item - Create item baru
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('ItemController: Create item request', { body: req.body });

      const validatedData = createItemSchema.parse(req.body);
      const item = await itemAgent.create(validatedData);

      res.status(201).json(successResponse('Item berhasil dibuat', item));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/item - Get list items
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('ItemController: Get all items', { query: req.query });

      const kategori = req.query.kategori as 'ATK' | 'OBAT' | undefined;
      const kode = req.query.kode as string | undefined;
      const nama = req.query.nama as string | undefined;
      const stokMenipis = req.query.stokMenipis === 'true';
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const result = await itemAgent.findAll(kategori, kode, nama, stokMenipis, page, limit);

      res.json(paginatedResponse('Data item berhasil diambil', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/item/:id - Get item by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('ItemController: Get item by ID', { id: req.params.id });

      const item = await itemAgent.findById(req.params.id);

      res.json(successResponse('Data item berhasil diambil', item));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/item/:id - Update item
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('ItemController: Update item', { id: req.params.id, body: req.body });

      const validatedData = updateItemSchema.parse(req.body);
      const item = await itemAgent.update(req.params.id, validatedData);

      res.json(successResponse('Item berhasil diupdate', item));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/item/:id - Delete item
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('ItemController: Delete item', { id: req.params.id });

      const item = await itemAgent.delete(req.params.id);

      res.json(successResponse('Item berhasil dihapus', item));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/item/stok-menipis - Get items dengan stok menipis
   */
  async getStokMenipis(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('ItemController: Get stok menipis', { query: req.query });

      const kategori = req.query.kategori as 'ATK' | 'OBAT' | undefined;
      const items = await itemAgent.getStokMenipis(kategori);

      res.json(successResponse('Data item stok menipis berhasil diambil', items));
    } catch (error) {
      next(error);
    }
  }
}

export const itemController = new ItemController();
