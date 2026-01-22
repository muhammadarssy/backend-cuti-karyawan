import prisma from '../lib/prisma.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface CreateLabelStrukDto {
  nama: string;
  deskripsi?: string;
  warna?: string; // hex color
}

export interface UpdateLabelStrukDto {
  nama?: string;
  deskripsi?: string;
  warna?: string;
  isAktif?: boolean;
}

/**
 * LabelStrukAgent - Business Logic untuk manajemen label struk
 */
export class LabelStrukAgent {
  /**
   * Create new label
   */
  async create(data: CreateLabelStrukDto) {
    logger.info('LabelStrukAgent: Creating new label', { nama: data.nama });

    // Validasi nama tidak duplikat
    const existing = await prisma.labelStruk.findUnique({
      where: { nama: data.nama },
    });

    if (existing) {
      logger.warn('LabelStrukAgent: Label already exists', { nama: data.nama });
      throw new ConflictError(`Label dengan nama "${data.nama}" sudah ada`);
    }

    // Simpan label
    const label = await prisma.labelStruk.create({
      data: {
        nama: data.nama,
        deskripsi: data.deskripsi,
        warna: data.warna,
        isAktif: true,
      },
    });

    logger.info('LabelStrukAgent: Label created successfully', {
      id: label.id,
      nama: label.nama,
    });

    return label;
  }

  /**
   * Get all labels with optional filter
   */
  async findAll(isAktif?: boolean, page: number = 1, limit: number = 50) {
    logger.info('LabelStrukAgent: Fetching all labels', { isAktif, page, limit });

    const where = isAktif !== undefined ? { isAktif } : undefined;
    const skip = (page - 1) * limit;

    const [labels, total] = await Promise.all([
      prisma.labelStruk.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nama: 'asc' },
        include: {
          _count: {
            select: {
              strukItem: true,
            },
          },
        },
      }),
      prisma.labelStruk.count({ where }),
    ]);

    logger.info('LabelStrukAgent: Fetched labels', { count: labels.length, total });

    return {
      data: labels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get label by ID
   */
  async findById(id: string) {
    logger.info('LabelStrukAgent: Fetching label by ID', { id });

    const label = await prisma.labelStruk.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            strukItem: true,
          },
        },
      },
    });

    if (!label) {
      logger.warn('LabelStrukAgent: Label not found', { id });
      throw new NotFoundError('Label tidak ditemukan');
    }

    logger.info('LabelStrukAgent: Label found', { id, nama: label.nama });

    return label;
  }

  /**
   * Get active labels only
   */
  async getActiveLabels() {
    logger.info('LabelStrukAgent: Fetching active labels');

    const labels = await prisma.labelStruk.findMany({
      where: { isAktif: true },
      orderBy: { nama: 'asc' },
    });

    logger.info('LabelStrukAgent: Active labels fetched', { count: labels.length });

    return labels;
  }

  /**
   * Update label
   */
  async update(id: string, data: UpdateLabelStrukDto) {
    logger.info('LabelStrukAgent: Updating label', { id });

    // Check if label exists
    await this.findById(id);

    // Jika update nama, cek duplikat
    if (data.nama) {
      const existing = await prisma.labelStruk.findUnique({
        where: { nama: data.nama },
      });

      if (existing && existing.id !== id) {
        throw new ConflictError(`Label dengan nama "${data.nama}" sudah ada`);
      }
    }

    const label = await prisma.labelStruk.update({
      where: { id },
      data,
    });

    logger.info('LabelStrukAgent: Label updated successfully', { id });

    return label;
  }

  /**
   * Delete label (soft delete dengan set isAktif = false)
   */
  async delete(id: string) {
    logger.info('LabelStrukAgent: Deleting label', { id });

    // Check if label exists
    const label = await this.findById(id);

    // Check if label has struk items
    const itemCount = await prisma.strukItem.count({
      where: { labelStrukId: id },
    });

    if (itemCount > 0) {
      // Soft delete
      const updated = await prisma.labelStruk.update({
        where: { id },
        data: { isAktif: false },
      });

      logger.info('LabelStrukAgent: Label deactivated (soft delete)', { id });
      return updated;
    }

    // Hard delete jika tidak ada item
    await prisma.labelStruk.delete({
      where: { id },
    });

    logger.info('LabelStrukAgent: Label deleted', { id });

    return label;
  }
}

// Export singleton instance
export const labelStrukAgent = new LabelStrukAgent();
