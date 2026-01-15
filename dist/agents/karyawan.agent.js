import prisma from '../lib/prisma.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
/**
 * KaryawanAgent - Business Logic untuk manajemen data karyawan
 */
export class KaryawanAgent {
    /**
     * Create new karyawan
     */
    async create(data) {
        logger.info('KaryawanAgent: Creating new karyawan', { nik: data.nik });
        // Validasi NIK tidak duplikat
        const existing = await prisma.karyawan.findUnique({
            where: { nik: data.nik },
        });
        if (existing) {
            logger.warn('KaryawanAgent: NIK already exists', { nik: data.nik });
            throw new ConflictError(`Karyawan dengan NIK ${data.nik} sudah terdaftar`);
        }
        // Simpan data karyawan
        const karyawan = await prisma.karyawan.create({
            data: {
                ...data,
                status: 'AKTIF',
            },
        });
        logger.info('KaryawanAgent: Karyawan created successfully', {
            id: karyawan.id,
            nik: karyawan.nik,
        });
        return karyawan;
    }
    /**
     * Get all karyawan with optional filters
     */
    async findAll(status, page = 1, limit = 20) {
        logger.info('KaryawanAgent: Fetching all karyawan', { status, page, limit });
        const where = status ? { status } : undefined;
        const skip = (page - 1) * limit;
        const [karyawan, total] = await Promise.all([
            prisma.karyawan.findMany({
                where,
                skip,
                take: limit,
                orderBy: { nama: 'asc' },
                include: {
                    _count: {
                        select: {
                            cutiTahunan: true,
                            cuti: true,
                        },
                    },
                },
            }),
            prisma.karyawan.count({ where }),
        ]);
        logger.info('KaryawanAgent: Fetched karyawan', { count: karyawan.length, total });
        return {
            data: karyawan,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get karyawan by ID
     */
    async findById(id) {
        logger.info('KaryawanAgent: Fetching karyawan by ID', { id });
        const karyawan = await prisma.karyawan.findUnique({
            where: { id },
            include: {
                cutiTahunan: {
                    orderBy: { tahun: 'desc' },
                },
                cuti: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!karyawan) {
            logger.warn('KaryawanAgent: Karyawan not found', { id });
            throw new NotFoundError('Karyawan tidak ditemukan');
        }
        logger.info('KaryawanAgent: Karyawan found', { id, nik: karyawan.nik });
        return karyawan;
    }
    /**
     * Get karyawan by NIK
     */
    async findByNik(nik) {
        logger.info('KaryawanAgent: Fetching karyawan by NIK', { nik });
        const karyawan = await prisma.karyawan.findUnique({
            where: { nik },
        });
        if (!karyawan) {
            logger.warn('KaryawanAgent: Karyawan not found', { nik });
            throw new NotFoundError('Karyawan tidak ditemukan');
        }
        return karyawan;
    }
    /**
     * Update karyawan
     */
    async update(id, data) {
        logger.info('KaryawanAgent: Updating karyawan', { id });
        // Check if karyawan exists
        await this.findById(id);
        const karyawan = await prisma.karyawan.update({
            where: { id },
            data,
        });
        logger.info('KaryawanAgent: Karyawan updated successfully', { id });
        return karyawan;
    }
    /**
     * Set karyawan status to NONAKTIF (soft delete)
     */
    async deactivate(id) {
        logger.info('KaryawanAgent: Deactivating karyawan', { id });
        const karyawan = await this.update(id, { status: 'NONAKTIF' });
        logger.info('KaryawanAgent: Karyawan deactivated', { id });
        return karyawan;
    }
    /**
     * Get active karyawan (untuk generate cuti tahunan)
     */
    async getActiveKaryawan() {
        logger.info('KaryawanAgent: Fetching active karyawan');
        const karyawan = await prisma.karyawan.findMany({
            where: { status: 'AKTIF' },
        });
        logger.info('KaryawanAgent: Active karyawan fetched', { count: karyawan.length });
        return karyawan;
    }
}
// Export singleton instance
export const karyawanAgent = new KaryawanAgent();
