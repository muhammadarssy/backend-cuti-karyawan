import { z } from 'zod';
import { budgetAgent } from '../agents/budget.agent.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';
const rincianSchema = z.object({
    kategoriBudgetId: z.string().uuid('Kategori budget ID tidak valid'),
    alokasi: z.number().int().positive('Alokasi harus lebih dari 0'),
});
const createBudgetSchema = z.object({
    bulan: z.number().int().min(1).max(12, 'Bulan harus antara 1-12'),
    tahun: z.number().int().min(2000).max(3000),
    rincian: z.array(rincianSchema).min(1, 'Budget harus memiliki minimal 1 rincian kategori'),
});
const updateBudgetSchema = z.object({
    rincian: z.array(rincianSchema).min(1, 'Budget harus memiliki minimal 1 rincian kategori'),
});
/**
 * BudgetController - API handlers untuk manajemen budget (dengan rincian per kategori/departemen)
 */
export class BudgetController {
    async create(req, res, next) {
        try {
            logger.info('BudgetController: Create budget request', { body: req.body });
            const validatedData = createBudgetSchema.parse(req.body);
            const budget = await budgetAgent.create(validatedData);
            res.status(201).json(successResponse('Budget berhasil ditambahkan', budget));
        }
        catch (error) {
            next(error);
        }
    }
    async findAll(req, res, next) {
        try {
            logger.info('BudgetController: Get all budget request', { query: req.query });
            const tahun = req.query.tahun ? parseInt(req.query.tahun) : undefined;
            const page = req.query.page ? parseInt(req.query.page) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit) : 20;
            const result = await budgetAgent.findAll(tahun, page, limit);
            res.json(paginatedResponse('Data budget berhasil diambil', result.data, result.pagination));
        }
        catch (error) {
            next(error);
        }
    }
    async findById(req, res, next) {
        try {
            const { id } = req.params;
            logger.info('BudgetController: Get budget by ID', { id });
            const budget = await budgetAgent.findById(id);
            res.json(successResponse('Data budget berhasil diambil', budget));
        }
        catch (error) {
            next(error);
        }
    }
    async findByBulanTahun(req, res, next) {
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
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { id } = req.params;
            logger.info('BudgetController: Update budget', { id, body: req.body });
            const validatedData = updateBudgetSchema.parse(req.body);
            const budget = await budgetAgent.update(id, validatedData);
            res.json(successResponse('Data budget berhasil diupdate', budget));
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            logger.info('BudgetController: Delete budget', { id });
            const budget = await budgetAgent.delete(id);
            res.json(successResponse('Budget berhasil dihapus', budget));
        }
        catch (error) {
            next(error);
        }
    }
    async getSummary(req, res, next) {
        try {
            const { id } = req.params;
            logger.info('BudgetController: Get budget summary', { id });
            const summary = await budgetAgent.getSummary(id);
            res.json(successResponse('Summary budget berhasil diambil', summary));
        }
        catch (error) {
            next(error);
        }
    }
}
export const budgetController = new BudgetController();
