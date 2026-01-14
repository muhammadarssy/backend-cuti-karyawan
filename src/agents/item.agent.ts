import prisma from '../lib/prisma.js';
import { NotFoundError, ValidationError, BusinessLogicError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { KategoriItem } from '@prisma/client';

export interface CreateItemDto {
  kode: string;
  nama: string;
  kategori: KategoriItem;
  satuan: string;
  stokMinimal?: number;
  stokSekarang?: number;
  keterangan?: string;
}

export interface UpdateItemDto {
  nama?: string;
  satuan?: string;
  stokMinimal?: number;
  keterangan?: string;
}

/**
 * ItemAgent - Business Logic untuk master data item (ATK & Obat)
 */
export class ItemAgent {
  /**
   * Create item baru
   */
  async create(data: CreateItemDto) {
    logger.info('ItemAgent: Creating new item', { kode: data.kode, kategori: data.kategori });

    // Check duplicate kode
    const existing = await prisma.item.findUnique({
      where: { kode: data.kode },
    });

    if (existing) {
      throw new ValidationError(`Kode item ${data.kode} sudah digunakan`);
    }

    const item = await prisma.item.create({
      data: {
        kode: data.kode,
        nama: data.nama,
        kategori: data.kategori,
        satuan: data.satuan,
        stokMinimal: data.stokMinimal ?? 0,
        stokSekarang: data.stokSekarang ?? 0,
        keterangan: data.keterangan,
      },
    });

    logger.info('ItemAgent: Item created successfully', { id: item.id, kode: item.kode });

    return item;
  }

  /**
   * Get item by ID dengan history transaksi
   */
  async findById(id: string) {
    logger.info('ItemAgent: Fetching item by ID', { id });

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        pembelian: {
          orderBy: { tanggal: 'desc' },
          take: 10,
        },
        pengeluaran: {
          orderBy: { tanggal: 'desc' },
          take: 10,
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Item tidak ditemukan');
    }

    return item;
  }

  /**
   * Get list items dengan filter
   */
  async findAll(
    kategori?: KategoriItem,
    kode?: string,
    nama?: string,
    stokMenipis?: boolean,
    page: number = 1,
    limit: number = 20
  ) {
    logger.info('ItemAgent: Fetching items', { kategori, kode, nama, stokMenipis, page, limit });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (kategori) where.kategori = kategori;
    if (kode) {
      where.kode = {
        contains: kode,
        mode: 'insensitive',
      };
    }
    if (nama) {
      where.nama = {
        contains: nama,
        mode: 'insensitive',
      };
    }
    if (stokMenipis === true) {
      where.stokSekarang = {
        lte: prisma.item.fields.stokMinimal,
      };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.item.count({ where }),
    ]);

    // Manual filter untuk stokMenipis karena Prisma tidak support field comparison
    let filteredItems = items;
    if (stokMenipis === true) {
      filteredItems = items.filter((item: { stokSekarang: number; stokMinimal: number }) => item.stokSekarang <= item.stokMinimal);
    }

    logger.info('ItemAgent: Items fetched', { count: filteredItems.length, total });

    return {
      data: filteredItems,
      pagination: {
        page,
        limit,
        total: stokMenipis === true ? filteredItems.length : total,
        totalPages: Math.ceil((stokMenipis === true ? filteredItems.length : total) / limit),
      },
    };
  }

  /**
   * Update item
   */
  async update(id: string, data: UpdateItemDto) {
    logger.info('ItemAgent: Updating item', { id, data });

    // Check exists
    const existing = await prisma.item.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Item tidak ditemukan');
    }

    const updated = await prisma.item.update({
      where: { id },
      data: {
        nama: data.nama,
        satuan: data.satuan,
        stokMinimal: data.stokMinimal,
        keterangan: data.keterangan,
      },
    });

    logger.info('ItemAgent: Item updated successfully', { id });

    return updated;
  }

  /**
   * Delete item (hanya jika tidak ada history transaksi)
   */
  async delete(id: string) {
    logger.info('ItemAgent: Deleting item', { id });

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        pembelian: true,
        pengeluaran: true,
      },
    });

    if (!item) {
      throw new NotFoundError('Item tidak ditemukan');
    }

    // Check history transaksi
    if (item.pembelian.length > 0 || item.pengeluaran.length > 0) {
      throw new BusinessLogicError(
        'Item tidak bisa dihapus karena memiliki history transaksi'
      );
    }

    await prisma.item.delete({ where: { id } });

    logger.info('ItemAgent: Item deleted successfully', { id });

    return item;
  }

  /**
   * Get items dengan stok menipis (stok <= stokMinimal)
   */
  async getStokMenipis(kategori?: KategoriItem) {
    logger.info('ItemAgent: Fetching items dengan stok menipis', { kategori });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (kategori) where.kategori = kategori;

    const items = await prisma.item.findMany({
      where,
      orderBy: { stokSekarang: 'asc' },
    });

    // Filter manual karena Prisma tidak support field comparison
    const filteredItems = items
      .filter((item) => item.stokSekarang <= item.stokMinimal)
      .map((item) => ({
        ...item,
        selisih: item.stokSekarang - item.stokMinimal,
      }));

    logger.info('ItemAgent: Stok menipis items fetched', { count: filteredItems.length });

    return filteredItems;
  }
}

export const itemAgent = new ItemAgent();
