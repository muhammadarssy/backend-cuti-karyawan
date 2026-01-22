import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { budgetAgent } from '../agents/budget.agent.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

// Validation schemas
const createBudgetSchema = z.object({
  bulan: z.number().int().min(1).max(12, 'Bulan harus antara 1-12'),
  tahun: z.number().int().min(2000).max(3000),
  totalBudget: z.number().int().positive('Total budget harus lebih dari 0'),
});

const updateBudgetSchema = z.object({
  totalBudget: z.number().int().positive().optional(),
});

/**
 * BudgetController - API handlers untuk manajemen budget
 */
export class BudgetController {
  /**
   * POST /api/budget - Create new budget
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('BudgetController: Create budget request', { body: req.body });

      const validatedData = createBudgetSchema.parse(req.body);

      const budget = await budgetAgent.create({
        bulan: validatedData.bulan,
        tahun: validatedData.tahun,
        totalBudget: validatedData.totalBudget,
      });

      res.status(201).json(successResponse('Budget berhasil ditambahkan', budget));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/budget - Get all budget
   */
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('BudgetController: Get all budget request', { query: req.query });

      const tahun = req.query.tahun ? parseInt(req.query.tahun as string) : undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const result = await budgetAgent.findAll(tahun, page, limit);

      res.json(paginatedResponse('Data budget berhasil diambil', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/budget/:id - Get budget by ID
   */
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info('BudgetController: Get budget by ID', { id });

      const budget = await budgetAgent.findById(id);

      res.json(successResponse('Data budget berhasil diambil', budget));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/budget/bulan/:bulan/tahun/:tahun - Get budget by bulan and tahun
   */
  async findByBulanTahun(req: Request, res: Response, next: NextFunction) {
    try {
      const bulan = parseInt(req.params.bulan);
      const tahun = parseInt(req.params.tahun);

      logger.info('BudgetController: Get budget by bulan and tahun', { bulan, tahun });

      if (bulan < 1 || bulan > 12) {
        return res.status(400).json({
          success: false,
          message: 'Bulan harus antara 1-12',
        });
      }

      const budget = await budgetAgent.findByBulanTahun(bulan, tahun);

      res.json(successResponse('Data budget berhasil diambil', budget));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/budget/:id - Update budget
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info('BudgetController: Update budget', { id, body: req.body });

      const validatedData = updateBudgetSchema.parse(req.body);

      const budget = await budgetAgent.update(id, validatedData);

      res.json(successResponse('Data budget berhasil diupdate', budget));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/budget/:id - Delete budget
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info('BudgetController: Delete budget', { id });

      const budget = await budgetAgent.delete(id);

      res.json(successResponse('Budget berhasil dihapus', budget));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/budget/:id/summary - Get budget summary
   */
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      logger.info('BudgetController: Get budget summary', { id });

      const summary = await budgetAgent.getSummary(id);

      res.json(successResponse('Summary budget berhasil diambil', summary));
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const budgetController = new BudgetController();
