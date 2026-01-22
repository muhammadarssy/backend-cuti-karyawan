import prisma from '../lib/prisma.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { TipeDiscount, Prisma } from '@prisma/client';

export interface StrukItemDto {
  labelStrukId: string;
  kategoriBudgetId: string; // Departemen yang menanggung (Pantry, HRD, dll)
  namaItem: string;
  itemId?: string;
  harga: number;
  qty: number;
  discountType?: TipeDiscount;
  discountValue?: number;
  keterangan?: string;
}

export interface CreateStrukDto {
  budgetId: string;
  tanggal: string | Date;
  nomorStruk?: string;
  fileBukti?: string;
  namaFileAsli?: string;
  items: StrukItemDto[];
  taxPersen?: number; // Tax dalam persen (opsional)
  taxNominal?: number; // Tax dalam nominal (opsional)
  keterangan?: string;
}

export interface UpdateStrukDto {
  tanggal?: string | Date;
  nomorStruk?: string;
  fileBukti?: string;
  namaFileAsli?: string;
  taxPersen?: number;
  taxNominal?: number;
  keterangan?: string;
}

/**
 * StrukAgent - Business Logic untuk manajemen struk pembelian
 */
export class StrukAgent {
  /**
   * Calculate discount nominal dari item
   */
  private calculateDiscount(
    subtotal: number,
    discountType?: TipeDiscount,
    discountValue?: number
  ): number {
    if (!discountType || !discountValue) {
      return 0;
    }

    if (discountType === 'BONUS') {
      // Discount berupa nominal tetap
      return Math.min(discountValue, subtotal); // Tidak boleh lebih dari subtotal
    } else if (discountType === 'PERSEN') {
      // Discount berupa persentase
      if (discountValue < 0 || discountValue > 100) {
        throw new ValidationError('Discount persen harus antara 0-100');
      }
      return Math.round((subtotal * discountValue) / 100);
    }

    return 0;
  }

  /**
   * Create new struk dengan items
   */
  async create(data: CreateStrukDto) {
    logger.info('StrukAgent: Creating new struk', {
      budgetId: data.budgetId,
      itemCount: data.items.length,
    });

    const budget = await prisma.budget.findUnique({
      where: { id: data.budgetId },
      include: { budgetKategori: { select: { kategoriBudgetId: true } } },
    });

    if (!budget) {
      throw new NotFoundError('Budget tidak ditemukan');
    }

    const allowedKategoriIds = new Set(
      budget.budgetKategori.map((bk) => bk.kategoriBudgetId)
    );

    // Validasi items tidak kosong
    if (!data.items || data.items.length === 0) {
      throw new ValidationError('Struk harus memiliki minimal 1 item');
    }

    // Validasi nomor struk unique jika ada
    if (data.nomorStruk) {
      const existing = await prisma.struk.findUnique({
        where: { nomorStruk: data.nomorStruk },
      });

      if (existing) {
        throw new ValidationError(`Nomor struk "${data.nomorStruk}" sudah digunakan`);
      }
    }

    // Validasi tax (hanya salah satu: taxPersen atau taxNominal)
    if (data.taxPersen !== undefined && data.taxNominal !== undefined) {
      throw new ValidationError('Hanya boleh mengisi salah satu: taxPersen atau taxNominal');
    }

    // Parse tanggal
    const tanggal = typeof data.tanggal === 'string' ? new Date(data.tanggal) : data.tanggal;

    // Process items dan hitung totals
    let totalHarga = 0;
    let totalDiscount = 0;
    const strukItems: Array<{
      labelStrukId: string;
      kategoriBudgetId: string;
      namaItem: string;
      itemId?: string;
      harga: number;
      qty: number;
      subtotal: number;
      discountType?: TipeDiscount;
      discountValue?: number;
      discountNominal: number;
      totalSetelahDiscount: number;
      keterangan?: string;
    }> = [];

    const labelIds = [...new Set(data.items.map((i) => i.labelStrukId))];
    const labels = await prisma.labelStruk.findMany({
      where: { id: { in: labelIds }, isAktif: true },
    });
    if (labels.length !== labelIds.length) {
      throw new NotFoundError('Salah satu atau lebih label tidak ditemukan atau tidak aktif');
    }

    for (const item of data.items) {
      if (!allowedKategoriIds.has(item.kategoriBudgetId)) {
        throw new ValidationError(
          `Kategori budget untuk item "${item.namaItem}" tidak termasuk dalam budget bulan ini`
        );
      }
    }

    // Process setiap item
    for (const item of data.items) {
      // Validasi item
      if (item.harga <= 0) {
        throw new ValidationError(`Harga item "${item.namaItem}" harus lebih dari 0`);
      }
      if (item.qty <= 0) {
        throw new ValidationError(`Quantity item "${item.namaItem}" harus lebih dari 0`);
      }

      const subtotal = item.harga * item.qty;
      const discountNominal = this.calculateDiscount(
        subtotal,
        item.discountType,
        item.discountValue
      );
      const totalSetelahDiscount = subtotal - discountNominal;

      totalHarga += subtotal;
      totalDiscount += discountNominal;

      strukItems.push({
        labelStrukId: item.labelStrukId,
        kategoriBudgetId: item.kategoriBudgetId,
        namaItem: item.namaItem,
        itemId: item.itemId,
        harga: item.harga,
        qty: item.qty,
        subtotal,
        discountType: item.discountType,
        discountValue: item.discountValue,
        discountNominal,
        totalSetelahDiscount,
        keterangan: item.keterangan,
      });
    }

    // Hitung tax
    let taxNominal = 0;
    let taxPersenValue: number | null = null;

    if (data.taxPersen !== undefined) {
      if (data.taxPersen < 0 || data.taxPersen > 100) {
        throw new ValidationError('Tax persen harus antara 0-100');
      }
      taxPersenValue = data.taxPersen;
      const totalSetelahDiscount = totalHarga - totalDiscount;
      taxNominal = Math.round((totalSetelahDiscount * data.taxPersen) / 100);
    } else if (data.taxNominal !== undefined) {
      if (data.taxNominal < 0) {
        throw new ValidationError('Tax nominal tidak boleh negatif');
      }
      taxNominal = data.taxNominal;
    }

    const totalSetelahTax = totalHarga - totalDiscount + taxNominal;

    // Create struk dengan items dalam transaction
    const struk = await prisma.$transaction(async (tx) => {
      // Create struk
      const newStruk = await tx.struk.create({
        data: {
          budgetId: data.budgetId,
          tanggal,
          nomorStruk: data.nomorStruk,
          fileBukti: data.fileBukti,
          namaFileAsli: data.namaFileAsli,
          totalHarga,
          totalDiscount,
          taxPersen: taxPersenValue ? taxPersenValue : null,
          taxNominal: taxNominal > 0 ? taxNominal : null,
          totalSetelahTax,
          keterangan: data.keterangan,
        },
      });

      await tx.strukItem.createMany({
        data: strukItems.map((item) => ({
          strukId: newStruk.id,
          labelStrukId: item.labelStrukId,
          kategoriBudgetId: item.kategoriBudgetId,
          namaItem: item.namaItem,
          itemId: item.itemId,
          harga: item.harga,
          qty: item.qty,
          subtotal: item.subtotal,
          discountType: item.discountType,
          discountValue: item.discountValue,
          discountNominal: item.discountNominal,
          totalSetelahDiscount: item.totalSetelahDiscount,
          keterangan: item.keterangan,
        })),
      });

      // Return dengan items
      return tx.struk.findUnique({
        where: { id: newStruk.id },
        include: {
          budget: { include: { budgetKategori: { include: { kategoriBudget: true } } } },
          strukItem: {
            include: {
              labelStruk: true,
              kategoriBudget: true,
              item: true,
            },
          },
        },
      });
    });

    logger.info('StrukAgent: Struk created successfully', {
      id: struk!.id,
      totalSetelahTax: struk!.totalSetelahTax,
    });

    return struk;
  }

  /**
   * Get all struk with optional filters
   */
  async findAll(
    budgetId?: string,
    tahun?: number,
    bulan?: number,
    page: number = 1,
    limit: number = 20
  ) {
    logger.info('StrukAgent: Fetching all struk', { budgetId, tahun, bulan, page, limit });

    const where: Prisma.StrukWhereInput = {};

    if (budgetId) {
      where.budgetId = budgetId;
    } else if (tahun) {
      where.budget = {
        tahun,
        ...(bulan ? { bulan } : {}),
      };
    }

    const skip = (page - 1) * limit;

    const [struk, total] = await Promise.all([
      prisma.struk.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tanggal: 'desc' },
        include: {
          budget: {
            include: { budgetKategori: { include: { kategoriBudget: true } } },
          },
          _count: { select: { strukItem: true } },
        },
      }),
      prisma.struk.count({ where }),
    ]);

    logger.info('StrukAgent: Fetched struk', { count: struk.length, total });

    return {
      data: struk,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get struk by ID
   */
  async findById(id: string) {
    logger.info('StrukAgent: Fetching struk by ID', { id });

    const struk = await prisma.struk.findUnique({
      where: { id },
      include: {
        budget: { include: { budgetKategori: { include: { kategoriBudget: true } } } },
        strukItem: {
          include: {
            labelStruk: true,
            kategoriBudget: true,
            item: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!struk) {
      logger.warn('StrukAgent: Struk not found', { id });
      throw new NotFoundError('Struk tidak ditemukan');
    }

    logger.info('StrukAgent: Struk found', { id });

    return struk;
  }

  /**
   * Update struk (hanya metadata, tidak bisa update items)
   */
  async update(id: string, data: UpdateStrukDto) {
    logger.info('StrukAgent: Updating struk', { id });

    // Check if struk exists
    await this.findById(id);

    // Validasi tax
    if (data.taxPersen !== undefined && data.taxNominal !== undefined) {
      throw new ValidationError('Hanya boleh mengisi salah satu: taxPersen atau taxNominal');
    }

    // Validasi nomor struk unique jika diupdate
    if (data.nomorStruk) {
      const existing = await prisma.struk.findUnique({
        where: { nomorStruk: data.nomorStruk },
      });

      if (existing && existing.id !== id) {
        throw new ValidationError(`Nomor struk "${data.nomorStruk}" sudah digunakan`);
      }
    }

    const updateData: Prisma.StrukUpdateInput = {};

    if (data.tanggal !== undefined) {
      updateData.tanggal = typeof data.tanggal === 'string' ? new Date(data.tanggal) : data.tanggal;
    }
    if (data.nomorStruk !== undefined) {
      updateData.nomorStruk = data.nomorStruk;
    }
    if (data.fileBukti !== undefined) {
      updateData.fileBukti = data.fileBukti;
    }
    if (data.namaFileAsli !== undefined) {
      updateData.namaFileAsli = data.namaFileAsli;
    }
    if (data.keterangan !== undefined) {
      updateData.keterangan = data.keterangan;
    }

    // Jika tax diupdate, perlu recalculate totalSetelahTax
    if (data.taxPersen !== undefined || data.taxNominal !== undefined) {
      const struk = await prisma.struk.findUnique({
        where: { id },
      });

      if (!struk) {
        throw new NotFoundError('Struk tidak ditemukan');
      }

      let taxNominal = 0;
      let taxPersenValue: number | null = null;

      if (data.taxPersen !== undefined) {
        if (data.taxPersen < 0 || data.taxPersen > 100) {
          throw new ValidationError('Tax persen harus antara 0-100');
        }
        taxPersenValue = data.taxPersen;
        const totalSetelahDiscount = struk.totalHarga - struk.totalDiscount;
        taxNominal = Math.round((totalSetelahDiscount * data.taxPersen) / 100);
      } else if (data.taxNominal !== undefined) {
        if (data.taxNominal < 0) {
          throw new ValidationError('Tax nominal tidak boleh negatif');
        }
        taxNominal = data.taxNominal;
      }

      updateData.taxPersen = taxPersenValue;
      updateData.taxNominal = taxNominal > 0 ? taxNominal : null;
      updateData.totalSetelahTax = struk.totalHarga - struk.totalDiscount + taxNominal;
    }

    const struk = await prisma.struk.update({
      where: { id },
      data: updateData,
      include: {
        budget: { include: { budgetKategori: { include: { kategoriBudget: true } } } },
        strukItem: {
          include: {
            labelStruk: true,
            kategoriBudget: true,
            item: true,
          },
        },
      },
    });

    logger.info('StrukAgent: Struk updated successfully', { id });

    return struk;
  }

  /**
   * Delete struk
   */
  async delete(id: string) {
    logger.info('StrukAgent: Deleting struk', { id });

    // Check if struk exists
    const struk = await this.findById(id);

    // Delete dalam transaction (cascade delete items)
    await prisma.$transaction(async (tx) => {
      // Delete items first
      await tx.strukItem.deleteMany({
        where: { strukId: id },
      });

      // Delete struk
      await tx.struk.delete({
        where: { id },
      });
    });

    logger.info('StrukAgent: Struk deleted', { id });

    return struk;
  }

  /**
   * Get rekap struk by label
   */
  async getRekapByLabel(budgetId?: string, tahun?: number, bulan?: number) {
    logger.info('StrukAgent: Getting rekap by label', { budgetId, tahun, bulan });

    const where: Prisma.StrukItemWhereInput = {};

    if (budgetId) {
      where.struk = { budgetId };
    } else if (tahun) {
      where.struk = {
        budget: {
          tahun,
          ...(bulan ? { bulan } : {}),
        },
      };
    }

    const rekap = await prisma.strukItem.groupBy({
      by: ['labelStrukId'],
      where,
      _sum: {
        totalSetelahDiscount: true,
        qty: true,
      },
      _count: {
        id: true,
      },
    });

    // Get label details
    const labelIds = rekap.map((r) => r.labelStrukId);
    const labels = await prisma.labelStruk.findMany({
      where: { id: { in: labelIds } },
    });

    const result = rekap.map((r) => {
      const label = labels.find((l) => l.id === r.labelStrukId);
      return {
        label: label || null,
        totalPengeluaran: r._sum.totalSetelahDiscount || 0,
        totalQty: r._sum.qty || 0,
        jumlahItem: r._count.id,
      };
    });

    return result;
  }

  /**
   * Get rekap struk by kategori/departemen
   */
  async getRekapByKategori(budgetId?: string, tahun?: number, bulan?: number) {
    logger.info('StrukAgent: Getting rekap by kategori', { budgetId, tahun, bulan });

    const where: Prisma.StrukItemWhereInput = {};

    if (budgetId) {
      where.struk = { budgetId };
    } else if (tahun) {
      where.struk = {
        budget: {
          tahun,
          ...(bulan ? { bulan } : {}),
        },
      };
    }

    const rekap = await prisma.strukItem.groupBy({
      by: ['kategoriBudgetId'],
      where,
      _sum: {
        totalSetelahDiscount: true,
        qty: true,
      },
      _count: { id: true },
    });

    const kategoriIds = rekap.map((r) => r.kategoriBudgetId);
    const kategoris = await prisma.kategoriBudget.findMany({
      where: { id: { in: kategoriIds } },
    });

    return rekap.map((r) => {
      const k = kategoris.find((x) => x.id === r.kategoriBudgetId);
      return {
        kategoriBudget: k ?? null,
        totalPengeluaran: r._sum.totalSetelahDiscount ?? 0,
        totalQty: r._sum.qty ?? 0,
        jumlahItem: r._count.id,
      };
    });
  }
}

// Export singleton instance
export const strukAgent = new StrukAgent();
