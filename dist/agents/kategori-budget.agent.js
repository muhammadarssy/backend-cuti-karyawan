import prisma from '../lib/prisma.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
/**
 * KategoriBudgetAgent - Business Logic untuk master departemen (Pantry, HRD, dll)
 */
export class KategoriBudgetAgent {
    async create(data) {
        logger.info('KategoriBudgetAgent: Creating', { nama: data.nama });
        const existing = await prisma.kategoriBudget.findUnique({
            where: { nama: data.nama },
        });
        if (existing) {
            throw new ConflictError(`Kategori budget "${data.nama}" sudah ada`);
        }
        const kb = await prisma.kategoriBudget.create({
            data: {
                nama: data.nama,
                deskripsi: data.deskripsi,
                isAktif: true,
            },
        });
        logger.info('KategoriBudgetAgent: Created', { id: kb.id, nama: kb.nama });
        return kb;
    }
    async findAll(isAktif, page = 1, limit = 50) {
        const where = isAktif !== undefined ? { isAktif } : undefined;
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            prisma.kategoriBudget.findMany({
                where,
                skip,
                take: limit,
                orderBy: { nama: 'asc' },
                include: {
                    _count: {
                        select: { strukItem: true },
                    },
                },
            }),
            prisma.kategoriBudget.count({ where }),
        ]);
        return {
            data,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async findById(id) {
        const kb = await prisma.kategoriBudget.findUnique({
            where: { id },
            include: { _count: { select: { strukItem: true } } },
        });
        if (!kb) {
            throw new NotFoundError('Kategori budget tidak ditemukan');
        }
        return kb;
    }
    async getActive() {
        return prisma.kategoriBudget.findMany({
            where: { isAktif: true },
            orderBy: { nama: 'asc' },
        });
    }
    async update(id, data) {
        await this.findById(id);
        if (data.nama) {
            const existing = await prisma.kategoriBudget.findUnique({
                where: { nama: data.nama },
            });
            if (existing && existing.id !== id) {
                throw new ConflictError(`Kategori budget "${data.nama}" sudah ada`);
            }
        }
        return prisma.kategoriBudget.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        const kb = await this.findById(id);
        const n = await prisma.strukItem.count({ where: { kategoriBudgetId: id } });
        if (n > 0) {
            await prisma.kategoriBudget.update({
                where: { id },
                data: { isAktif: false },
            });
            return prisma.kategoriBudget.findUnique({ where: { id } });
        }
        await prisma.kategoriBudget.delete({ where: { id } });
        return kb;
    }
}
export const kategoriBudgetAgent = new KategoriBudgetAgent();
