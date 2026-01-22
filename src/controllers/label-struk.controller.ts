import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { labelStrukAgent } from '../agents/label-struk.agent.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

// Validation schemas
const createLabelStrukSchema = z.object({
  nama: z.string().min(1, 'Nama label wajib diisi'),
  deskripsi: z.string().optional(),
  warna: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Format warna harus hex (#RRGGBB)').optional(),
});

const updateLabelStrukSchema = z.object({
  nama: z.string().min(1).optional(),
  deskripsi: z.string().optional(),
  warna: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isAktif: z.boolean().optional(),
});

/**
 * LabelStrukController - API handlers untuk manajemen label struk
 */
export class LabelStrukController {
  /**
   * POST /api/label-struk - Create new label
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('LabelStrukController: Create label request', { body: req.body });

      const validatedData = createLabelStrukSchema.parse(req.body);

      const label = await labelStrukAgent.create(validatedData);

      res.status(201).json(successResponse('Label berhasil ditambahkan', label));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/label-struk - Get all labels
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('LabelStrukController: Get all labels request', { query: req.query });

      const isAktif =
        req.query.isAktif !== undefined ? req.query.isAktif === 'true' : undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const result = await labelStrukAgent.findAll(isAktif, page, limit);

      res.json(paginatedResponse('Data label berhasil diambil', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/label-struk/active - Get active labels only
   */
  async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('LabelStrukController: Get active labels request');

      const labels = await labelStrukAgent.getActiveLabels();

      res.json(successResponse('Data label aktif berhasil diambil', labels));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/label-struk/:id - Get label by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info('LabelStrukController: Get label by ID', { id });

      const label = await labelStrukAgent.findById(id);

      res.json(successResponse('Data label berhasil diambil', label));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/label-struk/:id - Update label
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info('LabelStrukController: Update label', { id, body: req.body });

      const validatedData = updateLabelStrukSchema.parse(req.body);

      const label = await labelStrukAgent.update(id, validatedData);

      res.json(successResponse('Data label berhasil diupdate', label));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/label-struk/:id - Delete label
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info('LabelStrukController: Delete label', { id });

      const label = await labelStrukAgent.delete(id);

      res.json(successResponse('Label berhasil dihapus', label));
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const labelStrukController = new LabelStrukController();
