import prisma from '../lib/prisma.js';
import { ConflictError, NotFoundError, BusinessLogicError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface CreateBudgetDto {
  bulan: number; // 1-12
  tahun: number;
  totalBudget: number;
}

export interface UpdateBudgetDto {
  totalBudget?: number;
}

/**
 * BudgetAgent - Business Logic untuk manajemen budget bulanan
 */
export class BudgetAgent {
  /**
   * Create new budget
   */
  async create(data: CreateBudgetDto) {
    logger.info('BudgetAgent: Creating new budget', { bulan: data.bulan, tahun: data.tahun });

    // Validasi bulan (1-12)
    if (data.bulan < 1 || data.bulan > 12) {
      throw new BusinessLogicError('Bulan harus antara 1-12');
    }

    // Validasi budget tidak duplikat
    const existing = await prisma.budget.findUnique({
      where: {
        bulan_tahun: {
          bulan: data.bulan,
          tahun: data.tahun,
        },
      },
    });

    if (existing) {
      logger.warn('BudgetAgent: Budget already exists', { bulan: data.bulan, tahun: data.tahun });
      throw new ConflictError(`Budget untuk bulan ${data.bulan} tahun ${data.tahun} sudah ada`);
    }

    // Simpan budget
    const budget = await prisma.budget.create({
      data: {
        bulan: data.bulan,
        tahun: data.tahun,
        totalBudget: data.totalBudget,
      },
    });

    logger.info('BudgetAgent: Budget created successfully', {
      id: budget.id,
      bulan: budget.bulan,
      tahun: budget.tahun,
    });

    return budget;
  }

  /**
   * Get all budget with optional filters
   */
  async findAll(tahun?: number, page: number = 1, limit: number = 20) {
    logger.info('BudgetAgent: Fetching all budget', { tahun, page, limit });

    const where = tahun ? { tahun } : undefined;
    const skip = (page - 1) * limit;

    const [budget, total] = await Promise.all([
      prisma.budget.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }],
        include: {
          _count: {
            select: {
              struk: true,
            },
          },
        },
      }),
      prisma.budget.count({ where }),
    ]);

    logger.info('BudgetAgent: Fetched budget', { count: budget.length, total });

    return {
      data: budget,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get budget by ID
   */
  async findById(id: string) {
    logger.info('BudgetAgent: Fetching budget by ID', { id });

    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        struk: {
          orderBy: { tanggal: 'desc' },
          include: {
            _count: {
              select: {
                strukItem: true,
              },
            },
          },
        },
      },
    });

    if (!budget) {
      logger.warn('BudgetAgent: Budget not found', { id });
      throw new NotFoundError('Budget tidak ditemukan');
    }

    logger.info('BudgetAgent: Budget found', { id });

    return budget;
  }

  /**
   * Get budget by bulan and tahun
   */
  async findByBulanTahun(bulan: number, tahun: number) {
    logger.info('BudgetAgent: Fetching budget by bulan and tahun', { bulan, tahun });

    const budget = await prisma.budget.findUnique({
      where: {
        bulan_tahun: {
          bulan,
          tahun,
        },
      },
      include: {
        struk: {
          orderBy: { tanggal: 'desc' },
        },
      },
    });

    if (!budget) {
      logger.warn('BudgetAgent: Budget not found', { bulan, tahun });
      throw new NotFoundError('Budget tidak ditemukan');
    }

    return budget;
  }

  /**
   * Update budget
   */
  async update(id: string, data: UpdateBudgetDto) {
    logger.info('BudgetAgent: Updating budget', { id });

    // Check if budget exists
    await this.findById(id);

    const budget = await prisma.budget.update({
      where: { id },
      data,
    });

    logger.info('BudgetAgent: Budget updated successfully', { id });

    return budget;
  }

  /**
   * Delete budget
   */
  async delete(id: string) {
    logger.info('BudgetAgent: Deleting budget', { id });

    // Check if budget exists
    const budget = await this.findById(id);

    // Check if budget has struk
    const strukCount = await prisma.struk.count({
      where: { budgetId: id },
    });

    if (strukCount > 0) {
      throw new BusinessLogicError(
        `Budget tidak dapat dihapus karena sudah memiliki ${strukCount} struk`
      );
    }

    await prisma.budget.delete({
      where: { id },
    });

    logger.info('BudgetAgent: Budget deleted', { id });

    return budget;
  }

  /**
   * Get budget summary (total budget, total pengeluaran, sisa budget)
   */
  async getSummary(id: string) {
    logger.info('BudgetAgent: Getting budget summary', { id });

    const budget = await this.findById(id);

    // Hitung total pengeluaran dari semua struk
    const result = await prisma.struk.aggregate({
      where: { budgetId: id },
      _sum: {
        totalSetelahTax: true,
      },
    });

    const totalPengeluaran = result._sum.totalSetelahTax || 0;
    const sisaBudget = budget.totalBudget - totalPengeluaran;

    return {
      ...budget,
      totalPengeluaran,
      sisaBudget,
      persentaseTerpakai: budget.totalBudget > 0 
        ? (totalPengeluaran / budget.totalBudget) * 100 
        : 0,
    };
  }
}

// Export singleton instance
export const budgetAgent = new BudgetAgent();
