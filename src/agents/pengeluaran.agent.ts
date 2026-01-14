import prisma from '../lib/prisma.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { parseDate } from '../utils/date.js';
import type { KategoriItem } from '@prisma/client';

export interface CreatePengeluaranDto {
  itemId: string;
  jumlah: number;
  tanggal: string;
  keperluan: string;
  penerima?: string;
  keterangan?: string;
}

export interface UpdatePengeluaranDto {
  jumlah?: number;
  tanggal?: string;
  keperluan?: string;
  penerima?: string;
  keterangan?: string;
}

/**
 * PengeluaranAgent - Business Logic untuk transaksi pengeluaran (stock keluar)
 */
export class PengeluaranAgent {
  /**
   * Create pengeluaran baru (stock keluar)
   */
  async create(data: CreatePengeluaranDto) {
    logger.info('PengeluaranAgent: Creating new pengeluaran', { itemId: data.itemId });

    // Validate item exists
    const item = await prisma.item.findUnique({
      where: { id: data.itemId },
    });

    if (!item) {
      throw new NotFoundError('Item tidak ditemukan');
    }

    // Validate jumlah
    if (data.jumlah <= 0) {
      throw new ValidationError('Jumlah harus lebih dari 0');
    }

    // Parse tanggal
    const tanggal = parseDate(data.tanggal);

    // Transaction: Create pengeluaran dan update stok
    const pengeluaran = await prisma.$transaction(async (tx) => {
      // Create pengeluaran
      const newPengeluaran = await tx.pengeluaran.create({
        data: {
          itemId: data.itemId,
          jumlah: data.jumlah,
          tanggal,
          keperluan: data.keperluan,
          penerima: data.penerima,
          keterangan: data.keterangan,
        },
        include: {
          item: {
            select: {
              kode: true,
              nama: true,
              stokSekarang: true,
            },
          },
        },
      });

      // Update stok item (bisa negatif untuk emergency)
      await tx.item.update({
        where: { id: data.itemId },
        data: {
          stokSekarang: { decrement: data.jumlah },
        },
      });

      return newPengeluaran;
    });

    logger.info('PengeluaranAgent: Pengeluaran created and stock updated', {
      id: pengeluaran.id,
      jumlah: data.jumlah,
    });

    return pengeluaran;
  }

  /**
   * Get pengeluaran by ID
   */
  async findById(id: string) {
    logger.info('PengeluaranAgent: Fetching pengeluaran by ID', { id });

    const pengeluaran = await prisma.pengeluaran.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            kode: true,
            nama: true,
            kategori: true,
            satuan: true,
            stokSekarang: true,
          },
        },
      },
    });

    if (!pengeluaran) {
      throw new NotFoundError('Pengeluaran tidak ditemukan');
    }

    return pengeluaran;
  }

  /**
   * Get list pengeluaran dengan filter
   */
  async findAll(
    itemId?: string,
    kategori?: KategoriItem,
    keperluan?: string,
    penerima?: string,
    tanggalMulai?: string,
    tanggalSelesai?: string,
    page: number = 1,
    limit: number = 20
  ) {
    logger.info('PengeluaranAgent: Fetching pengeluaran list', {
      itemId,
      kategori,
      keperluan,
      penerima,
      tanggalMulai,
      tanggalSelesai,
      page,
      limit,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (itemId) where.itemId = itemId;
    if (keperluan) {
      where.keperluan = {
        contains: keperluan,
        mode: 'insensitive',
      };
    }
    if (penerima) {
      where.penerima = {
        contains: penerima,
        mode: 'insensitive',
      };
    }
    if (tanggalMulai || tanggalSelesai) {
      where.tanggal = {};
      if (tanggalMulai) where.tanggal.gte = parseDate(tanggalMulai);
      if (tanggalSelesai) where.tanggal.lte = parseDate(tanggalSelesai);
    }
    if (kategori) {
      where.item = {
        kategori,
      };
    }

    const skip = (page - 1) * limit;

    const [pengeluaran, total] = await Promise.all([
      prisma.pengeluaran.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tanggal: 'desc' },
        include: {
          item: {
            select: {
              kode: true,
              nama: true,
              kategori: true,
              satuan: true,
            },
          },
        },
      }),
      prisma.pengeluaran.count({ where }),
    ]);

    logger.info('PengeluaranAgent: Pengeluaran list fetched', {
      count: pengeluaran.length,
      total,
    });

    return {
      data: pengeluaran,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update pengeluaran
   */
  async update(id: string, data: UpdatePengeluaranDto) {
    logger.info('PengeluaranAgent: Updating pengeluaran', { id, data });

    // Get old pengeluaran
    const oldPengeluaran = await prisma.pengeluaran.findUnique({
      where: { id },
    });

    if (!oldPengeluaran) {
      throw new NotFoundError('Pengeluaran tidak ditemukan');
    }

    // Parse tanggal jika ada
    const tanggal = data.tanggal ? parseDate(data.tanggal) : undefined;

    // Get new jumlah
    const newJumlah = data.jumlah ?? oldPengeluaran.jumlah;

    // Transaction: Update pengeluaran dan adjust stok
    const updated = await prisma.$transaction(async (tx) => {
      // Update pengeluaran
      const updatedPengeluaran = await tx.pengeluaran.update({
        where: { id },
        data: {
          jumlah: newJumlah,
          tanggal,
          keperluan: data.keperluan,
          penerima: data.penerima,
          keterangan: data.keterangan,
        },
        include: {
          item: {
            select: {
              stokSekarang: true,
            },
          },
        },
      });

      // Adjust stok jika jumlah berubah
      if (data.jumlah !== undefined && data.jumlah !== oldPengeluaran.jumlah) {
        // Rollback jumlah lama (tambah kembali)
        // Kurangi jumlah baru
        const selisih = oldPengeluaran.jumlah - newJumlah;
        await tx.item.update({
          where: { id: oldPengeluaran.itemId },
          data: {
            stokSekarang: { increment: selisih },
          },
        });
      }

      return updatedPengeluaran;
    });

    logger.info('PengeluaranAgent: Pengeluaran updated successfully', { id });

    return updated;
  }

  /**
   * Delete pengeluaran (rollback stok)
   */
  async delete(id: string) {
    logger.info('PengeluaranAgent: Deleting pengeluaran', { id });

    const pengeluaran = await prisma.pengeluaran.findUnique({
      where: { id },
      include: {
        item: true,
      },
    });

    if (!pengeluaran) {
      throw new NotFoundError('Pengeluaran tidak ditemukan');
    }

    // Transaction: Delete pengeluaran dan rollback stok
    await prisma.$transaction(async (tx) => {
      await tx.pengeluaran.delete({ where: { id } });

      // Rollback stok (tambah kembali)
      await tx.item.update({
        where: { id: pengeluaran.itemId },
        data: {
          stokSekarang: { increment: pengeluaran.jumlah },
        },
      });
    });

    logger.info('PengeluaranAgent: Pengeluaran deleted and stock rolled back', { id });

    return pengeluaran;
  }

  /**
   * Get rekap pengeluaran
   */
  async getRekapPengeluaran(
    kategori?: KategoriItem,
    tanggalMulai?: string,
    tanggalSelesai?: string,
    groupBy: 'item' | 'keperluan' | 'penerima' = 'item'
  ) {
    logger.info('PengeluaranAgent: Getting rekap pengeluaran', {
      kategori,
      tanggalMulai,
      tanggalSelesai,
      groupBy,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (tanggalMulai || tanggalSelesai) {
      where.tanggal = {};
      if (tanggalMulai) where.tanggal.gte = parseDate(tanggalMulai);
      if (tanggalSelesai) where.tanggal.lte = parseDate(tanggalSelesai);
    }
    if (kategori) {
      where.item = { kategori };
    }

    if (groupBy === 'item') {
      const rekap = await prisma.pengeluaran.groupBy({
        by: ['itemId'],
        where,
        _sum: {
          jumlah: true,
        },
        _count: {
          id: true,
        },
      });

      // Enrich dengan data item
      const enrichedRekap = await Promise.all(
        rekap.map(async (r) => {
          const item = await prisma.item.findUnique({
            where: { id: r.itemId },
            select: { kode: true, nama: true, kategori: true },
          });

          return {
            itemId: r.itemId,
            kode: item?.kode,
            nama: item?.nama,
            kategori: item?.kategori,
            totalJumlah: r._sum.jumlah || 0,
            totalTransaksi: r._count.id,
          };
        })
      );

      return {
        periode: {
          mulai: tanggalMulai || '-',
          selesai: tanggalSelesai || '-',
        },
        rekap: enrichedRekap,
      };
    } else if (groupBy === 'keperluan') {
      const rekap = await prisma.pengeluaran.groupBy({
        by: ['keperluan'],
        where,
        _sum: {
          jumlah: true,
        },
        _count: {
          id: true,
        },
      });

      return {
        periode: {
          mulai: tanggalMulai || '-',
          selesai: tanggalSelesai || '-',
        },
        rekap: rekap.map((r) => ({
          keperluan: r.keperluan,
          totalJumlah: r._sum.jumlah || 0,
          totalTransaksi: r._count.id,
        })),
      };
    } else {
      // groupBy penerima
      const rekap = await prisma.pengeluaran.groupBy({
        by: ['penerima'],
        where,
        _sum: {
          jumlah: true,
        },
        _count: {
          id: true,
        },
      });

      return {
        periode: {
          mulai: tanggalMulai || '-',
          selesai: tanggalSelesai || '-',
        },
        rekap: rekap.map((r) => ({
          penerima: r.penerima || 'Tidak ada penerima',
          totalJumlah: r._sum.jumlah || 0,
          totalTransaksi: r._count.id,
        })),
      };
    }
  }
}

export const pengeluaranAgent = new PengeluaranAgent();
