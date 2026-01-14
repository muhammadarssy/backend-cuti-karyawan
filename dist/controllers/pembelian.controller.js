import { z } from 'zod';
import { pembelianAgent } from '../agents/pembelian.agent.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';
// Validation schemas
const createPembelianSchema = z.object({
    itemId: z.string().uuid('Item ID tidak valid'),
    jumlah: z.number().int().positive('Jumlah harus lebih dari 0'),
    tanggal: z.string().datetime('Format tanggal tidak valid'),
    supplier: z.string().optional(),
    hargaSatuan: z.number().int().min(0, 'Harga satuan tidak boleh negatif'),
    keterangan: z.string().optional(),
});
const updatePembelianSchema = z.object({
    jumlah: z.number().int().positive('Jumlah harus lebih dari 0').optional(),
    tanggal: z.string().datetime('Format tanggal tidak valid').optional(),
    supplier: z.string().optional(),
    hargaSatuan: z.number().int().min(0, 'Harga satuan tidak boleh negatif').optional(),
    keterangan: z.string().optional(),
});
/**
 * PembelianController - API handlers untuk manajemen transaksi pembelian
 */
export class PembelianController {
    /**
     * POST /api/pembelian - Create pembelian baru
     */
    async create(req, res, next) {
        try {
            logger.info('PembelianController: Create pembelian request', { body: req.body });
            const validatedData = createPembelianSchema.parse(req.body);
            const pembelian = await pembelianAgent.create(validatedData);
            res.status(201).json(successResponse('Pembelian berhasil dicatat', pembelian));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/pembelian - Get list pembelian
     */
    async findAll(req, res, next) {
        try {
            logger.info('PembelianController: Get all pembelian', { query: req.query });
            const itemId = req.query.itemId;
            const kategori = req.query.kategori;
            const supplier = req.query.supplier;
            const tanggalMulai = req.query.tanggalMulai;
            const tanggalSelesai = req.query.tanggalSelesai;
            const page = req.query.page ? parseInt(req.query.page) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit) : 20;
            const result = await pembelianAgent.findAll(itemId, kategori, supplier, tanggalMulai, tanggalSelesai, page, limit);
            res.json(paginatedResponse('Data pembelian berhasil diambil', result.data, result.pagination));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/pembelian/:id - Get pembelian by ID
     */
    async findById(req, res, next) {
        try {
            logger.info('PembelianController: Get pembelian by ID', { id: req.params.id });
            const pembelian = await pembelianAgent.findById(req.params.id);
            res.json(successResponse('Data pembelian berhasil diambil', pembelian));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PUT /api/pembelian/:id - Update pembelian
     */
    async update(req, res, next) {
        try {
            logger.info('PembelianController: Update pembelian', { id: req.params.id, body: req.body });
            const validatedData = updatePembelianSchema.parse(req.body);
            const pembelian = await pembelianAgent.update(req.params.id, validatedData);
            res.json(successResponse('Pembelian berhasil diupdate', pembelian));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /api/pembelian/:id - Delete pembelian
     */
    async delete(req, res, next) {
        try {
            logger.info('PembelianController: Delete pembelian', { id: req.params.id });
            const pembelian = await pembelianAgent.delete(req.params.id);
            res.json(successResponse('Pembelian berhasil dihapus', pembelian));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/pembelian/rekap - Get rekap pembelian
     */
    async getRekapPembelian(req, res, next) {
        try {
            logger.info('PembelianController: Get rekap pembelian', { query: req.query });
            const kategori = req.query.kategori;
            const tanggalMulai = req.query.tanggalMulai;
            const tanggalSelesai = req.query.tanggalSelesai;
            const groupBy = req.query.groupBy || 'item';
            const rekap = await pembelianAgent.getRekapPembelian(kategori, tanggalMulai, tanggalSelesai, groupBy);
            res.json(successResponse('Rekap pembelian berhasil diambil', rekap));
        }
        catch (error) {
            next(error);
        }
    }
}
export const pembelianController = new PembelianController();
