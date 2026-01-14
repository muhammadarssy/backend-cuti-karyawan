import prisma from '../lib/prisma.js';
import { NotFoundError, ValidationError, BusinessLogicError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { parseDate } from '../utils/date.js';
import type { KategoriItem } from '@prisma/client';

export interface CreatePembelianDto {
  itemId: string;
  jumlah: number;
  tanggal: string;
  supplier?: string;
  hargaSatuan: number;
  keterangan?: string;
}

export interface UpdatePembelianDto {
  jumlah?: number;
  tanggal?: string;
  supplier?: string;
  hargaSatuan?: number;
  keterangan?: string;
}

/**
 * PembelianAgent - Business Logic untuk transaksi pembelian (stock masuk)
 */
export class PembelianAgent {
  /**
   * Create pembelian baru (stock masuk)
   */
  async create(data: CreatePembelianDto) {
    logger.info('PembelianAgent: Creating new pembelian', { itemId: data.itemId });

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

    // Calculate total harga
    const totalHarga = data.jumlah * data.hargaSatuan;

    // Transaction: Create pembelian dan update stok
    const pembelian = await prisma.$transaction(async (tx) => {
      // Create pembelian
      const newPembelian = await tx.pembelian.create({
        data: {
          itemId: data.itemId,
          jumlah: data.jumlah,
          tanggal,
          supplier: data.supplier,
          hargaSatuan: data.hargaSatuan,
          totalHarga,
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

      // Update stok item
      await tx.item.update({
        where: { id: data.itemId },
        data: {
          stokSekarang: { increment: data.jumlah },
        },
      });

      return newPembelian;
    });

    logger.info('PembelianAgent: Pembelian created and stock updated', {
      id: pembelian.id,
      jumlah: data.jumlah,
    });

    return pembelian;
  }

  /**
   * Get pembelian by ID
   */
  async findById(id: string) {
    logger.info('PembelianAgent: Fetching pembelian by ID', { id });

    const pembelian = await prisma.pembelian.findUnique({
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

    if (!pembelian) {
      throw new NotFoundError('Pembelian tidak ditemukan');
    }

    return pembelian;
  }

  /**
   * Get list pembelian dengan filter
   */
  async findAll(
    itemId?: string,
    kategori?: KategoriItem,
    supplier?: string,
    tanggalMulai?: string,
    tanggalSelesai?: string,
    page: number = 1,
    limit: number = 20
  ) {
    logger.info('PembelianAgent: Fetching pembelian list', {
      itemId,
      kategori,
      supplier,
      tanggalMulai,
      tanggalSelesai,
      page,
      limit,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (itemId) where.itemId = itemId;
    if (supplier) {
      where.supplier = {
        contains: supplier,
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

    const [pembelian, total] = await Promise.all([
      prisma.pembelian.findMany({
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
      prisma.pembelian.count({ where }),
    ]);

    logger.info('PembelianAgent: Pembelian list fetched', { count: pembelian.length, total });

    return {
      data: pembelian,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update pembelian
   */
  async update(id: string, data: UpdatePembelianDto) {
    logger.info('PembelianAgent: Updating pembelian', { id, data });

    // Get old pembelian
    const oldPembelian = await prisma.pembelian.findUnique({
      where: { id },
    });

    if (!oldPembelian) {
      throw new NotFoundError('Pembelian tidak ditemukan');
    }

    // Parse tanggal jika ada
    const tanggal = data.tanggal ? parseDate(data.tanggal) : undefined;

    // Calculate new values
    const newJumlah = data.jumlah ?? oldPembelian.jumlah;
    const newHargaSatuan = data.hargaSatuan ?? oldPembelian.hargaSatuan;
    const newTotalHarga = newJumlah * newHargaSatuan;

    // Transaction: Update pembelian dan adjust stok
    const updated = await prisma.$transaction(async (tx) => {
      // Update pembelian
      const updatedPembelian = await tx.pembelian.update({
        where: { id },
        data: {
          jumlah: newJumlah,
          tanggal,
          supplier: data.supplier,
          hargaSatuan: newHargaSatuan,
          totalHarga: newTotalHarga,
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
      if (data.jumlah !== undefined && data.jumlah !== oldPembelian.jumlah) {
        const selisih = newJumlah - oldPembelian.jumlah;
        await tx.item.update({
          where: { id: oldPembelian.itemId },
          data: {
            stokSekarang: { increment: selisih },
          },
        });
      }

      return updatedPembelian;
    });

    logger.info('PembelianAgent: Pembelian updated successfully', { id });

    return updated;
  }

  /**
   * Delete pembelian (rollback stok)
   */
  async delete(id: string) {
    logger.info('PembelianAgent: Deleting pembelian', { id });

    const pembelian = await prisma.pembelian.findUnique({
      where: { id },
      include: {
        item: true,
      },
    });

    if (!pembelian) {
      throw new NotFoundError('Pembelian tidak ditemukan');
    }

    // Check if stock sufficient for rollback
    if (pembelian.item.stokSekarang < pembelian.jumlah) {
      throw new BusinessLogicError(
        'Stok tidak cukup untuk rollback pembelian. Stok saat ini: ' +
          pembelian.item.stokSekarang +
          ', Jumlah pembelian: ' +
          pembelian.jumlah
      );
    }

    // Transaction: Delete pembelian dan rollback stok
    await prisma.$transaction(async (tx) => {
      await tx.pembelian.delete({ where: { id } });

      await tx.item.update({
        where: { id: pembelian.itemId },
        data: {
          stokSekarang: { decrement: pembelian.jumlah },
        },
      });
    });

    logger.info('PembelianAgent: Pembelian deleted and stock rolled back', { id });

    return pembelian;
  }

  /**
   * Get rekap pembelian
   */
  async getRekapPembelian(
    kategori?: KategoriItem,
    tanggalMulai?: string,
    tanggalSelesai?: string,
    groupBy: 'item' | 'supplier' = 'item'
  ) {
    logger.info('PembelianAgent: Getting rekap pembelian', {
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
      const rekap = await prisma.pembelian.groupBy({
        by: ['itemId'],
        where,
        _sum: {
          jumlah: true,
          totalHarga: true,
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
            totalNilai: r._sum.totalHarga || 0,
            totalTransaksi: r._count.id,
          };
        })
      );

      const totalNilai = rekap.reduce((sum, r) => sum + (r._sum.totalHarga || 0), 0);

      return {
        periode: {
          mulai: tanggalMulai || '-',
          selesai: tanggalSelesai || '-',
        },
        totalNilai,
        rekap: enrichedRekap,
      };
    } else {
      // groupBy supplier
      const rekap = await prisma.pembelian.groupBy({
        by: ['supplier'],
        where,
        _sum: {
          totalHarga: true,
        },
        _count: {
          id: true,
        },
      });

      const totalNilai = rekap.reduce((sum, r) => sum + (r._sum.totalHarga || 0), 0);

      return {
        periode: {
          mulai: tanggalMulai || '-',
          selesai: tanggalSelesai || '-',
        },
        totalNilai,
        rekap: rekap.map((r) => ({
          supplier: r.supplier || 'Tidak ada supplier',
          totalNilai: r._sum.totalHarga || 0,
          totalTransaksi: r._count.id,
        })),
      };
    }
  }
}

export const pembelianAgent = new PembelianAgent();
