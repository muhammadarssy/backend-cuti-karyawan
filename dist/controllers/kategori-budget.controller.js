import { z } from 'zod';
import { kategoriBudgetAgent } from '../agents/kategori-budget.agent.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';
const createSchema = z.object({
    nama: z.string().min(1, 'Nama wajib diisi'),
    deskripsi: z.string().optional(),
});
const updateSchema = z.object({
    nama: z.string().min(1).optional(),
    deskripsi: z.string().optional(),
    isAktif: z.boolean().optional(),
});
/**
 * KategoriBudgetController - API handlers untuk master departemen (Pantry, HRD, dll)
 */
export class KategoriBudgetController {
    async create(req, res, next) {
        try {
            logger.info('KategoriBudgetController: Create', { body: req.body });
            const validatedData = createSchema.parse(req.body);
            const kb = await kategoriBudgetAgent.create(validatedData);
            res.status(201).json(successResponse('Kategori budget berhasil ditambahkan', kb));
        }
        catch (error) {
            next(error);
        }
    }
    async findAll(req, res, next) {
        try {
            const isAktif = req.query.isAktif !== undefined ? req.query.isAktif === 'true' : undefined;
            const page = req.query.page ? parseInt(req.query.page) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit) : 50;
            const result = await kategoriBudgetAgent.findAll(isAktif, page, limit);
            res.json(paginatedResponse('Data kategori budget berhasil diambil', result.data, result.pagination));
        }
        catch (error) {
            next(error);
        }
    }
    async findById(req, res, next) {
        try {
            const { id } = req.params;
            const kb = await kategoriBudgetAgent.findById(id);
            res.json(successResponse('Data kategori budget berhasil diambil', kb));
        }
        catch (error) {
            next(error);
        }
    }
    async getActive(req, res, next) {
        try {
            const list = await kategoriBudgetAgent.getActive();
            res.json(successResponse('Data kategori budget aktif berhasil diambil', list));
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const validatedData = updateSchema.parse(req.body);
            const kb = await kategoriBudgetAgent.update(id, validatedData);
            res.json(successResponse('Data kategori budget berhasil diupdate', kb));
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const kb = await kategoriBudgetAgent.delete(id);
            res.json(successResponse('Kategori budget berhasil dihapus', kb));
        }
        catch (error) {
            next(error);
        }
    }
}
export const kategoriBudgetController = new KategoriBudgetController();
