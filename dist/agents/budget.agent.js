import prisma from '../lib/prisma.js';
import { ConflictError, NotFoundError, BusinessLogicError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
/**
 * BudgetAgent - Business Logic untuk manajemen budget bulanan (dengan rincian per kategori/departemen)
 */
export class BudgetAgent {
    async create(data) {
        logger.info('BudgetAgent: Creating new budget', { bulan: data.bulan, tahun: data.tahun });
        if (data.bulan < 1 || data.bulan > 12) {
            throw new BusinessLogicError('Bulan harus antara 1-12');
        }
        if (!data.rincian || data.rincian.length === 0) {
            throw new ValidationError('Budget harus memiliki minimal 1 rincian kategori');
        }
        const existing = await prisma.budget.findUnique({
            where: { bulan_tahun: { bulan: data.bulan, tahun: data.tahun } },
        });
        if (existing) {
            throw new ConflictError(`Budget untuk bulan ${data.bulan} tahun ${data.tahun} sudah ada`);
        }
        const totalBudget = data.rincian.reduce((s, r) => s + r.alokasi, 0);
        if (totalBudget <= 0) {
            throw new ValidationError('Total alokasi harus lebih dari 0');
        }
        const kategoriIds = data.rincian.map((r) => r.kategoriBudgetId);
        const kategoris = await prisma.kategoriBudget.findMany({
            where: { id: { in: kategoriIds }, isAktif: true },
        });
        if (kategoris.length !== new Set(kategoriIds).size) {
            throw new NotFoundError('Salah satu atau lebih kategori budget tidak ditemukan atau tidak aktif');
        }
        const dup = new Set();
        for (const r of data.rincian) {
            if (dup.has(r.kategoriBudgetId)) {
                throw new ValidationError(`Kategori budget duplikat: ${r.kategoriBudgetId}`);
            }
            dup.add(r.kategoriBudgetId);
            if (r.alokasi <= 0) {
                throw new ValidationError('Alokasi per kategori harus lebih dari 0');
            }
        }
        const budget = await prisma.$transaction(async (tx) => {
            const b = await tx.budget.create({
                data: { bulan: data.bulan, tahun: data.tahun, totalBudget },
            });
            await tx.budgetKategori.createMany({
                data: data.rincian.map((r) => ({
                    budgetId: b.id,
                    kategoriBudgetId: r.kategoriBudgetId,
                    alokasi: r.alokasi,
                })),
            });
            return tx.budget.findUnique({
                where: { id: b.id },
                include: {
                    budgetKategori: {
                        include: { kategoriBudget: true },
                    },
                },
            });
        });
        logger.info('BudgetAgent: Budget created', { id: budget.id, totalBudget });
        return budget;
    }
    async findAll(tahun, page = 1, limit = 20) {
        const where = tahun ? { tahun } : undefined;
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            prisma.budget.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }],
                include: {
                    budgetKategori: { include: { kategoriBudget: true } },
                    _count: { select: { struk: true } },
                },
            }),
            prisma.budget.count({ where }),
        ]);
        return {
            data,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async findById(id) {
        const budget = await prisma.budget.findUnique({
            where: { id },
            include: {
                budgetKategori: { include: { kategoriBudget: true } },
                struk: {
                    orderBy: { tanggal: 'desc' },
                    include: { _count: { select: { strukItem: true } } },
                },
            },
        });
        if (!budget) {
            throw new NotFoundError('Budget tidak ditemukan');
        }
        return budget;
    }
    async findByBulanTahun(bulan, tahun) {
        const budget = await prisma.budget.findUnique({
            where: { bulan_tahun: { bulan, tahun } },
            include: {
                budgetKategori: { include: { kategoriBudget: true } },
                struk: { orderBy: { tanggal: 'desc' } },
            },
        });
        if (!budget) {
            throw new NotFoundError('Budget tidak ditemukan');
        }
        return budget;
    }
    async update(id, data) {
        await this.findById(id);
        if (!data.rincian || data.rincian.length === 0) {
            throw new ValidationError('Budget harus memiliki minimal 1 rincian kategori');
        }
        const totalBudget = data.rincian.reduce((s, r) => s + r.alokasi, 0);
        if (totalBudget <= 0) {
            throw new ValidationError('Total alokasi harus lebih dari 0');
        }
        const kategoriIds = data.rincian.map((r) => r.kategoriBudgetId);
        const kategoris = await prisma.kategoriBudget.findMany({
            where: { id: { in: kategoriIds }, isAktif: true },
        });
        if (kategoris.length !== new Set(kategoriIds).size) {
            throw new NotFoundError('Salah satu atau lebih kategori budget tidak ditemukan atau tidak aktif');
        }
        const dup = new Set();
        for (const r of data.rincian) {
            if (dup.has(r.kategoriBudgetId)) {
                throw new ValidationError('Kategori budget duplikat');
            }
            dup.add(r.kategoriBudgetId);
            if (r.alokasi <= 0) {
                throw new ValidationError('Alokasi per kategori harus lebih dari 0');
            }
        }
        const strukCount = await prisma.struk.count({ where: { budgetId: id } });
        if (strukCount > 0) {
            const existingKategoriIds = await prisma.budgetKategori.findMany({
                where: { budgetId: id },
                select: { kategoriBudgetId: true },
            });
            const existingSet = new Set(existingKategoriIds.map((e) => e.kategoriBudgetId));
            const newSet = new Set(kategoriIds);
            for (const kid of existingSet) {
                if (!newSet.has(kid)) {
                    const used = await prisma.strukItem.count({
                        where: {
                            struk: { budgetId: id },
                            kategoriBudgetId: kid,
                        },
                    });
                    if (used > 0) {
                        throw new BusinessLogicError('Tidak bisa menghapus kategori yang sudah dipakai di struk. Nonaktifkan saja jika perlu.');
                    }
                }
            }
        }
        const budget = await prisma.$transaction(async (tx) => {
            await tx.budgetKategori.deleteMany({ where: { budgetId: id } });
            await tx.budgetKategori.createMany({
                data: data.rincian.map((r) => ({
                    budgetId: id,
                    kategoriBudgetId: r.kategoriBudgetId,
                    alokasi: r.alokasi,
                })),
            });
            return tx.budget.update({
                where: { id },
                data: { totalBudget },
                include: {
                    budgetKategori: { include: { kategoriBudget: true } },
                },
            });
        });
        logger.info('BudgetAgent: Budget updated', { id });
        return budget;
    }
    async delete(id) {
        const budget = await this.findById(id);
        const strukCount = await prisma.struk.count({ where: { budgetId: id } });
        if (strukCount > 0) {
            throw new BusinessLogicError(`Budget tidak dapat dihapus karena sudah memiliki ${strukCount} struk`);
        }
        await prisma.budget.delete({ where: { id } });
        logger.info('BudgetAgent: Budget deleted', { id });
        return budget;
    }
    /**
     * Summary: total + rincian per kategori (alokasi, terpakai, sisa)
     */
    async getSummary(id) {
        const budget = await this.findById(id);
        const totalPengeluaranResult = await prisma.struk.aggregate({
            where: { budgetId: id },
            _sum: { totalSetelahTax: true },
        });
        const totalPengeluaran = totalPengeluaranResult._sum.totalSetelahTax || 0;
        const sisaBudget = budget.totalBudget - totalPengeluaran;
        const byKategori = await prisma.strukItem.groupBy({
            by: ['kategoriBudgetId'],
            where: { struk: { budgetId: id } },
            _sum: { totalSetelahDiscount: true },
        });
        const kategoriMap = new Map(budget.budgetKategori.map((bk) => [
            bk.kategoriBudgetId,
            {
                kategoriBudget: bk.kategoriBudget,
                alokasi: bk.alokasi,
                terpakai: 0,
                sisa: bk.alokasi,
            },
        ]));
        for (const g of byKategori) {
            const v = kategoriMap.get(g.kategoriBudgetId);
            if (v) {
                v.terpakai = g._sum.totalSetelahDiscount || 0;
                v.sisa = v.alokasi - v.terpakai;
            }
        }
        return {
            ...budget,
            totalPengeluaran,
            sisaBudget,
            persentaseTerpakai: budget.totalBudget > 0 ? (totalPengeluaran / budget.totalBudget) * 100 : 0,
            rincianPerKategori: Array.from(kategoriMap.values()),
        };
    }
}
export const budgetAgent = new BudgetAgent();
