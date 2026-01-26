import { z } from 'zod';
import { strukAgent } from '../agents/struk.agent.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';
// Validation schemas
const strukItemSchema = z.object({
    labelStrukId: z.string().uuid('Label ID tidak valid'),
    kategoriBudgetId: z.string().uuid('Kategori/departemen budget wajib diisi'),
    namaItem: z.string().min(1, 'Nama item wajib diisi'),
    itemId: z.string().uuid().optional(),
    harga: z.number().int().positive('Harga harus lebih dari 0'),
    qty: z.number().int().positive('Quantity harus lebih dari 0'),
    discountType: z.enum(['BONUS', 'PERSEN']).optional(),
    discountValue: z.number().int().min(0).optional(),
    keterangan: z.string().optional(),
});
const createStrukSchema = z.object({
    budgetId: z.string().uuid('Budget ID tidak valid'),
    tanggal: z.string().datetime('Format tanggal tidak valid'),
    nomorStruk: z.string().optional(),
    fileBukti: z.string().optional(),
    namaFileAsli: z.string().optional(),
    items: z.array(strukItemSchema).min(1, 'Struk harus memiliki minimal 1 item'),
    taxPersen: z.number().min(0).max(100, 'Tax persen harus antara 0-100').optional(),
    taxNominal: z.number().int().min(0, 'Tax nominal tidak boleh negatif').optional(),
    keterangan: z.string().optional(),
});
const updateStrukSchema = z.object({
    tanggal: z.string().datetime().optional(),
    nomorStruk: z.string().optional(),
    fileBukti: z.string().optional(),
    namaFileAsli: z.string().optional(),
    taxPersen: z.number().min(0).max(100).optional(),
    taxNominal: z.number().int().min(0).optional(),
    keterangan: z.string().optional(),
});
/**
 * StrukController - API handlers untuk manajemen struk pembelian
 */
export class StrukController {
    /**
     * POST /api/struk - Create new struk
     */
    async create(req, res, next) {
        try {
            logger.info('StrukController: Create struk request', { body: req.body });
            const validatedData = createStrukSchema.parse(req.body);
            // Validasi tax
            if (validatedData.taxPersen !== undefined && validatedData.taxNominal !== undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Hanya boleh mengisi salah satu: taxPersen atau taxNominal',
                });
            }
            const struk = await strukAgent.create({
                budgetId: validatedData.budgetId,
                tanggal: validatedData.tanggal,
                nomorStruk: validatedData.nomorStruk,
                fileBukti: validatedData.fileBukti,
                namaFileAsli: validatedData.namaFileAsli,
                items: validatedData.items,
                taxPersen: validatedData.taxPersen,
                taxNominal: validatedData.taxNominal,
                keterangan: validatedData.keterangan,
            });
            res.status(201).json(successResponse('Struk berhasil ditambahkan', struk));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/struk - Get all struk
     */
    async findAll(req, res, next) {
        try {
            logger.info('StrukController: Get all struk request', { query: req.query });
            const budgetId = req.query.budgetId;
            const tahun = req.query.tahun ? parseInt(req.query.tahun) : undefined;
            const bulan = req.query.bulan ? parseInt(req.query.bulan) : undefined;
            const page = req.query.page ? parseInt(req.query.page) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit) : 20;
            const result = await strukAgent.findAll(budgetId, tahun, bulan, page, limit);
            res.json(paginatedResponse('Data struk berhasil diambil', result.data, result.pagination));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/struk/:id - Get struk by ID
     */
    async findById(req, res, next) {
        try {
            const { id } = req.params;
            logger.info('StrukController: Get struk by ID', { id });
            const struk = await strukAgent.findById(id);
            res.json(successResponse('Data struk berhasil diambil', struk));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PUT /api/struk/:id - Update struk
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            logger.info('StrukController: Update struk', { id, body: req.body });
            const validatedData = updateStrukSchema.parse(req.body);
            // Validasi tax
            if (validatedData.taxPersen !== undefined && validatedData.taxNominal !== undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Hanya boleh mengisi salah satu: taxPersen atau taxNominal',
                });
            }
            const struk = await strukAgent.update(id, validatedData);
            res.json(successResponse('Data struk berhasil diupdate', struk));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /api/struk/:id - Delete struk
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            logger.info('StrukController: Delete struk', { id });
            const struk = await strukAgent.delete(id);
            res.json(successResponse('Struk berhasil dihapus', struk));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/struk/rekap/label - Get rekap struk by label
     */
    async getRekapByLabel(req, res, next) {
        try {
            logger.info('StrukController: Get rekap by label request', { query: req.query });
            const budgetId = req.query.budgetId;
            const tahun = req.query.tahun ? parseInt(req.query.tahun) : undefined;
            const bulan = req.query.bulan ? parseInt(req.query.bulan) : undefined;
            const rekap = await strukAgent.getRekapByLabel(budgetId, tahun, bulan);
            res.json(successResponse('Rekap struk by label berhasil diambil', rekap));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/struk/rekap/kategori - Get rekap struk by kategori/departemen
     */
    async getRekapByKategori(req, res, next) {
        try {
            logger.info('StrukController: Get rekap by kategori request', { query: req.query });
            const budgetId = req.query.budgetId;
            const tahun = req.query.tahun ? parseInt(req.query.tahun) : undefined;
            const bulan = req.query.bulan ? parseInt(req.query.bulan) : undefined;
            const rekap = await strukAgent.getRekapByKategori(budgetId, tahun, bulan);
            res.json(successResponse('Rekap struk by kategori berhasil diambil', rekap));
        }
        catch (error) {
            next(error);
        }
    }
}
// Export singleton instance
export const strukController = new StrukController();
