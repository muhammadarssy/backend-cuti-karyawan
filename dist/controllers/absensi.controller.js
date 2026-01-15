import { z } from 'zod';
import { absensiAgent } from '../agents/absensi.agent.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { BadRequestError } from '../utils/errors.js';
// Validation schemas
const uploadFingerprintSchema = z.object({
    tanggal: z.string().datetime('Format tanggal tidak valid'),
});
const createAbsensiManualSchema = z.object({
    karyawanId: z.string().uuid('Karyawan ID tidak valid'),
    tanggal: z.string().datetime('Format tanggal tidak valid'),
    statusKehadiran: z.enum(['SAKIT', 'IZIN', 'WFH', 'TANPA_KETERANGAN', 'CUTI', 'CUTI_BAKU', 'SECURITY', 'TUGAS', 'BELUM_FINGERPRINT'], {
        message: 'Status kehadiran tidak valid',
    }),
    keterangan: z.string().optional(),
    diinputOleh: z.string().optional(),
});
const bulkCreateAbsensiManualSchema = z.object({
    karyawanIds: z.array(z.string().uuid('Karyawan ID tidak valid')).min(1, 'Minimal satu karyawan harus dipilih'),
    tanggal: z.string().datetime('Format tanggal tidak valid'),
    statusKehadiran: z.enum(['SAKIT', 'IZIN', 'WFH', 'TANPA_KETERANGAN', 'CUTI', 'CUTI_BAKU', 'SECURITY', 'TUGAS', 'BELUM_FINGERPRINT'], {
        message: 'Status kehadiran tidak valid',
    }),
    keterangan: z.string().optional(),
    diinputOleh: z.string().optional(),
});
const updateAbsensiSchema = z.object({
    statusKehadiran: z.enum(['HADIR', 'SAKIT', 'IZIN', 'WFH', 'TANPA_KETERANGAN', 'CUTI', 'CUTI_BAKU', 'SECURITY', 'TUGAS', 'BELUM_FINGERPRINT']).optional(),
    keterangan: z.string().optional(),
    diinputOleh: z.string().optional(),
});
const queryAbsensiSchema = z.object({
    tanggalMulai: z.string().datetime().optional(),
    tanggalSelesai: z.string().datetime().optional(),
    karyawanId: z.string().uuid().optional(),
    statusKehadiran: z.enum(['HADIR', 'SAKIT', 'IZIN', 'WFH', 'TANPA_KETERANGAN', 'CUTI', 'CUTI_BAKU', 'SECURITY', 'TUGAS', 'BELUM_FINGERPRINT']).optional(),
    isManual: z.enum(['true', 'false']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
});
/**
 * AbsensiController - API handlers untuk manajemen absensi
 */
export class AbsensiController {
    /**
     * POST /api/absensi/upload-fingerprint - Upload file fingerprint Excel
     */
    async uploadFingerprint(req, res, next) {
        try {
            logger.info('AbsensiController: Upload fingerprint request');
            // Validasi file upload
            if (!req.file) {
                throw new BadRequestError('File Excel wajib diupload');
            }
            // Validasi tanggal dari body
            const validatedData = uploadFingerprintSchema.parse(req.body);
            const tanggal = new Date(validatedData.tanggal);
            // Process file
            const result = await absensiAgent.processFingerprint(req.file.buffer, tanggal);
            logger.info('AbsensiController: Fingerprint processed', { result });
            res.json(successResponse('Upload fingerprint berhasil diproses', result));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/absensi/belum-absen - Get karyawan yang belum absen
     */
    async getKaryawanBelumAbsen(req, res, next) {
        try {
            const { tanggal } = req.query;
            if (!tanggal || typeof tanggal !== 'string') {
                throw new BadRequestError('Parameter tanggal wajib diisi');
            }
            const tanggalParsed = new Date(tanggal);
            if (isNaN(tanggalParsed.getTime())) {
                throw new BadRequestError('Format tanggal tidak valid');
            }
            logger.info('AbsensiController: Get karyawan belum absen', { tanggal });
            const karyawan = await absensiAgent.getKaryawanBelumAbsen(tanggalParsed);
            res.json(successResponse('Data karyawan belum absen berhasil diambil', { karyawan, total: karyawan.length }));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/absensi/manual - Create absensi manual
     */
    async createManual(req, res, next) {
        try {
            logger.info('AbsensiController: Create manual absensi', { body: req.body });
            const validatedData = createAbsensiManualSchema.parse(req.body);
            const absensi = await absensiAgent.createManual({
                karyawanId: validatedData.karyawanId,
                tanggal: new Date(validatedData.tanggal),
                statusKehadiran: validatedData.statusKehadiran,
                keterangan: validatedData.keterangan,
                diinputOleh: validatedData.diinputOleh,
            });
            res.status(201).json(successResponse('Absensi manual berhasil dibuat', absensi));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/absensi/bulk-manual - Bulk create absensi manual
     */
    async bulkCreateManual(req, res, next) {
        try {
            logger.info('AbsensiController: Bulk create manual absensi', {
                karyawanCount: req.body.karyawanIds?.length
            });
            const validatedData = bulkCreateAbsensiManualSchema.parse(req.body);
            const result = await absensiAgent.bulkCreateManual({
                karyawanIds: validatedData.karyawanIds,
                tanggal: new Date(validatedData.tanggal),
                statusKehadiran: validatedData.statusKehadiran,
                keterangan: validatedData.keterangan,
                diinputOleh: validatedData.diinputOleh,
            });
            res.status(201).json(successResponse('Bulk absensi manual berhasil diproses', result));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/absensi - Get all absensi dengan filter
     */
    async findAll(req, res, next) {
        try {
            logger.info('AbsensiController: Get all absensi', { query: req.query });
            const validatedQuery = queryAbsensiSchema.parse(req.query);
            const tanggalMulai = validatedQuery.tanggalMulai
                ? new Date(validatedQuery.tanggalMulai)
                : undefined;
            const tanggalSelesai = validatedQuery.tanggalSelesai
                ? new Date(validatedQuery.tanggalSelesai)
                : undefined;
            const isManual = validatedQuery.isManual
                ? validatedQuery.isManual === 'true'
                : undefined;
            const page = validatedQuery.page ? parseInt(validatedQuery.page) : 1;
            const limit = validatedQuery.limit ? parseInt(validatedQuery.limit) : 50;
            const result = await absensiAgent.findAll(tanggalMulai, tanggalSelesai, validatedQuery.karyawanId, validatedQuery.statusKehadiran, isManual, page, limit);
            res.json(paginatedResponse('Data absensi berhasil diambil', result.data, result.pagination));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/absensi/:id - Get absensi by ID
     */
    async findById(req, res, next) {
        try {
            const { id } = req.params;
            logger.info('AbsensiController: Get absensi by ID', { id });
            const absensi = await absensiAgent.findById(id);
            res.json(successResponse('Data absensi berhasil diambil', absensi));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PUT /api/absensi/:id - Update absensi (manual only)
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            logger.info('AbsensiController: Update absensi', { id, body: req.body });
            const validatedData = updateAbsensiSchema.parse(req.body);
            const absensi = await absensiAgent.update(id, validatedData);
            res.json(successResponse('Absensi berhasil diupdate', absensi));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /api/absensi/:id - Delete absensi
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            logger.info('AbsensiController: Delete absensi', { id });
            await absensiAgent.delete(id);
            res.json(successResponse('Absensi berhasil dihapus'));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/absensi/ringkasan - Get ringkasan absensi
     */
    async getRingkasan(req, res, next) {
        try {
            const { tanggalMulai, tanggalSelesai, karyawanId } = req.query;
            if (!tanggalMulai || !tanggalSelesai) {
                throw new BadRequestError('Parameter tanggalMulai dan tanggalSelesai wajib diisi');
            }
            logger.info('AbsensiController: Get ringkasan absensi', {
                tanggalMulai,
                tanggalSelesai,
                karyawanId,
            });
            const ringkasan = await absensiAgent.getRingkasan(new Date(tanggalMulai), new Date(tanggalSelesai), karyawanId);
            res.json(successResponse('Ringkasan absensi berhasil diambil', ringkasan));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Export absensi to Excel
     */
    async exportToExcel(req, res, next) {
        try {
            const { tanggalMulai, tanggalSelesai } = req.query;
            if (!tanggalMulai || !tanggalSelesai) {
                throw new BadRequestError('Parameter tanggalMulai dan tanggalSelesai wajib diisi');
            }
            logger.info('AbsensiController: Export absensi to Excel', {
                tanggalMulai,
                tanggalSelesai,
            });
            const buffer = await absensiAgent.exportToExcel(new Date(tanggalMulai), new Date(tanggalSelesai));
            // Set response headers for file download
            const filename = `Absensi_${tanggalMulai}_${tanggalSelesai}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        }
        catch (error) {
            next(error);
        }
    }
}
// Export singleton instance
export const absensiController = new AbsensiController();
