import prisma from '../lib/prisma.js';
import { BusinessLogicError, NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import {
  calculateWorkingDays,
  getYearFromDate,
  parseDate,
  validateDateRange,
} from '../utils/date.js';
import { cutiTahunanAgent } from './cuti-tahunan.agent.js';
import type { JenisCuti } from '@prisma/client';

export interface CreateCutiDto {
  karyawanId: string;
  jenis: JenisCuti;
  alasan: string;
  tanggalMulai: string;
  tanggalSelesai: string;
}

export interface UpdateCutiDto {
  jenis?: JenisCuti;
  alasan?: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
}

/**
 * CutiAgent - Business Logic untuk transaksi cuti
 * Sistem ini tidak menggunakan approval, setiap cuti langsung mengurangi saldo
 */
export class CutiAgent {
  /**
   * Create/record cuti baru
   * Langsung memotong saldo cuti tahunan
   */
  async create(data: CreateCutiDto) {
    logger.info('CutiAgent: Creating new cuti', {
      karyawanId: data.karyawanId,
      jenis: data.jenis,
    });

    // Parse dan validasi tanggal
    const tanggalMulai = parseDate(data.tanggalMulai);
    const tanggalSelesai = parseDate(data.tanggalSelesai);

    if (!validateDateRange(tanggalMulai, tanggalSelesai)) {
      throw new ValidationError('Tanggal selesai harus lebih besar atau sama dengan tanggal mulai');
    }

    // Hitung jumlah hari
    const jumlahHari = calculateWorkingDays(tanggalMulai, tanggalSelesai);

    if (jumlahHari <= 0) {
      throw new ValidationError('Jumlah hari cuti harus lebih dari 0');
    }

    // Tentukan tahun dari tanggal mulai
    const tahun = getYearFromDate(tanggalMulai);

    // Cek apakah karyawan ada
    const karyawan = await prisma.karyawan.findUnique({
      where: { id: data.karyawanId },
    });

    if (!karyawan) {
      throw new NotFoundError('Karyawan tidak ditemukan');
    }

    // Ambil data cuti tahunan untuk tahun terkait
    let cutiTahunan;
    try {
      cutiTahunan = await cutiTahunanAgent.findByKaryawanAndTahun(data.karyawanId, tahun);
    } catch (error) {
      // Jika belum ada data cuti tahunan, generate dulu
      if (error instanceof NotFoundError) {
        logger.info('CutiAgent: Cuti tahunan not found, generating...', {
          karyawanId: data.karyawanId,
          tahun,
        });
        cutiTahunan = await cutiTahunanAgent.generateCutiTahunan(data.karyawanId, tahun);
      } else {
        throw error;
      }
    }

    // Tidak perlu validasi saldo - biarkan sisaCuti bisa negatif
    // Karyawan bisa menggunakan cuti sebelum dapat jatah
    // Saat generate nanti, akan dipotong otomatis

    // Transaksi: Buat data cuti dan update saldo dalam satu transaksi
    const cuti = await prisma.$transaction(async (tx) => {
      // Simpan data cuti
      const newCuti = await tx.cuti.create({
        data: {
          karyawanId: data.karyawanId,
          cutiTahunanId: cutiTahunan.id,
          tahun,
          jenis: data.jenis,
          alasan: data.alasan,
          tanggalMulai,
          tanggalSelesai,
          jumlahHari,
        },
        include: {
          karyawan: {
            select: {
              id: true,
              nik: true,
              nama: true,
            },
          },
        },
      });

      // Update saldo cuti tahunan hanya untuk jenis TAHUNAN
      if (data.jenis === 'TAHUNAN') {
        await tx.cutiTahunan.update({
          where: { id: cutiTahunan.id },
          data: {
            cutiTerpakai: cutiTahunan.cutiTerpakai + jumlahHari,
            sisaCuti: cutiTahunan.sisaCuti - jumlahHari,
          },
        });
      }

      return newCuti;
    });

    logger.info('CutiAgent: Cuti created successfully', {
      id: cuti.id,
      karyawanId: data.karyawanId,
      jenis: data.jenis,
      jumlahHari,
    });

    return cuti;
  }

  /**
   * Delete/rollback cuti
   * Mengembalikan saldo cuti tahunan
   */
  async delete(id: string) {
    logger.info('CutiAgent: Deleting cuti', { id });

    // Ambil data cuti
    const cuti = await prisma.cuti.findUnique({
      where: { id },
      include: {
        cutiTahunan: true,
      },
    });

    if (!cuti) {
      throw new NotFoundError('Data cuti tidak ditemukan');
    }

    // Transaksi: Hapus cuti dan rollback saldo
    await prisma.$transaction(async (tx) => {
      // Hapus data cuti
      await tx.cuti.delete({
        where: { id },
      });

      // Rollback saldo cuti tahunan hanya untuk jenis TAHUNAN
      if (cuti.jenis === 'TAHUNAN') {
        await tx.cutiTahunan.update({
          where: { id: cuti.cutiTahunanId },
          data: {
            cutiTerpakai: cuti.cutiTahunan.cutiTerpakai - cuti.jumlahHari,
            sisaCuti: cuti.cutiTahunan.sisaCuti + cuti.jumlahHari,
          },
        });
      }
    });

    logger.info('CutiAgent: Cuti deleted and saldo rolled back', { id });

    return cuti;
  }

  /**
   * Update cuti
   * Rollback saldo lama dan potong saldo baru jika diperlukan
   */
  async update(id: string, data: UpdateCutiDto) {
    logger.info('CutiAgent: Updating cuti', { id, data });

    // Ambil data cuti lama
    const oldCuti = await prisma.cuti.findUnique({
      where: { id },
      include: {
        cutiTahunan: true,
      },
    });

    if (!oldCuti) {
      throw new NotFoundError('Data cuti tidak ditemukan');
    }

    // Hitung data baru
    let tanggalMulai = oldCuti.tanggalMulai;
    let tanggalSelesai = oldCuti.tanggalSelesai;
    let jumlahHari = oldCuti.jumlahHari;
    const jenis = data.jenis || oldCuti.jenis;

    // Jika tanggal diubah, hitung ulang
    if (data.tanggalMulai || data.tanggalSelesai) {
      tanggalMulai = data.tanggalMulai ? parseDate(data.tanggalMulai) : oldCuti.tanggalMulai;
      tanggalSelesai = data.tanggalSelesai ? parseDate(data.tanggalSelesai) : oldCuti.tanggalSelesai;

      if (!validateDateRange(tanggalMulai, tanggalSelesai)) {
        throw new ValidationError('Tanggal selesai harus lebih besar atau sama dengan tanggal mulai');
      }

      jumlahHari = calculateWorkingDays(tanggalMulai, tanggalSelesai);

      if (jumlahHari <= 0) {
        throw new ValidationError('Jumlah hari cuti harus lebih dari 0');
      }
    }

    // Tentukan tahun dari tanggal mulai
    const tahun = getYearFromDate(tanggalMulai);

    // Jika tahun berubah, ambil data cuti tahunan yang baru
    let cutiTahunan = oldCuti.cutiTahunan;
    if (tahun !== oldCuti.tahun) {
      try {
        cutiTahunan = await cutiTahunanAgent.findByKaryawanAndTahun(oldCuti.karyawanId, tahun);
      } catch (error) {
        if (error instanceof NotFoundError) {
          logger.info('CutiAgent: Cuti tahunan not found for new year, generating...', {
            karyawanId: oldCuti.karyawanId,
            tahun,
          });
          cutiTahunan = await cutiTahunanAgent.generateCutiTahunan(oldCuti.karyawanId, tahun);
        } else {
          throw error;
        }
      }
    }

    // Transaksi: Update cuti dan adjust saldo
    const updatedCuti = await prisma.$transaction(async (tx) => {
      // Rollback saldo lama untuk jenis TAHUNAN
      if (oldCuti.jenis === 'TAHUNAN') {
        await tx.cutiTahunan.update({
          where: { id: oldCuti.cutiTahunanId },
          data: {
            cutiTerpakai: oldCuti.cutiTahunan.cutiTerpakai - oldCuti.jumlahHari,
            sisaCuti: oldCuti.cutiTahunan.sisaCuti + oldCuti.jumlahHari,
          },
        });
      }

      // Update data cuti
      const updated = await tx.cuti.update({
        where: { id },
        data: {
          ...(data.jenis && { jenis: data.jenis }),
          ...(data.alasan && { alasan: data.alasan }),
          ...(data.tanggalMulai && { tanggalMulai }),
          ...(data.tanggalSelesai && { tanggalSelesai }),
          ...(data.tanggalMulai || data.tanggalSelesai ? { jumlahHari } : {}),
          ...(tahun !== oldCuti.tahun && { tahun, cutiTahunanId: cutiTahunan.id }),
        },
        include: {
          karyawan: {
            select: {
              id: true,
              nik: true,
              nama: true,
            },
          },
        },
      });

      // Potong saldo baru untuk jenis TAHUNAN
      if (jenis === 'TAHUNAN') {
        // Refresh data cutiTahunan jika tahun berubah
        const targetCutiTahunan = tahun !== oldCuti.tahun ? cutiTahunan : oldCuti.cutiTahunan;
        const currentSaldo = tahun !== oldCuti.tahun 
          ? targetCutiTahunan.sisaCuti 
          : targetCutiTahunan.sisaCuti + oldCuti.jumlahHari; // sudah di-rollback di atas

        await tx.cutiTahunan.update({
          where: { id: targetCutiTahunan.id },
          data: {
            cutiTerpakai: { increment: jumlahHari },
            sisaCuti: currentSaldo - jumlahHari,
          },
        });
      }

      return updated;
    });

    logger.info('CutiAgent: Cuti updated successfully', {
      id,
      oldJumlahHari: oldCuti.jumlahHari,
      newJumlahHari: jumlahHari,
    });

    return updatedCuti;
  }

  /**
   * Get cuti by ID
   */
  async findById(id: string) {
    logger.info('CutiAgent: Fetching cuti by ID', { id });

    const cuti = await prisma.cuti.findUnique({
      where: { id },
      include: {
        karyawan: {
          select: {
            id: true,
            nik: true,
            nama: true,
            jabatan: true,
            departemen: true,
          },
        },
        cutiTahunan: {
          select: {
            tahun: true,
            jatahDasar: true,
            carryForward: true,
            totalHakCuti: true,
            cutiTerpakai: true,
            sisaCuti: true,
          },
        },
      },
    });

    if (!cuti) {
      logger.warn('CutiAgent: Cuti not found', { id });
      throw new NotFoundError('Data cuti tidak ditemukan');
    }

    return cuti;
  }

  /**
   * Get list cuti dengan filter
   */
  async findAll(
    karyawanId?: string,
    jenis?: JenisCuti,
    tahun?: number,
    page: number = 1,
    limit: number = 20
  ) {
    logger.info('CutiAgent: Fetching cuti list', { karyawanId, jenis, tahun, page, limit });

    const where: {
      karyawanId?: string;
      jenis?: JenisCuti;
      tahun?: number;
    } = {};

    if (karyawanId) where.karyawanId = karyawanId;
    if (jenis) where.jenis = jenis;
    if (tahun) where.tahun = tahun;

    const skip = (page - 1) * limit;

    const [cuti, total] = await Promise.all([
      prisma.cuti.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          karyawan: {
            select: {
              id: true,
              nik: true,
              nama: true,
              jabatan: true,
              departemen: true,
            },
          },
        },
      }),
      prisma.cuti.count({ where }),
    ]);

    logger.info('CutiAgent: Cuti list fetched', { count: cuti.length, total });

    return {
      data: cuti,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get rekap alasan cuti
   */
  async getRekapAlasanCuti(tahun?: number) {
    logger.info('CutiAgent: Fetching rekap alasan cuti', { tahun });

    const where: {
      tahun?: number;
    } = {};

    if (tahun) where.tahun = tahun;

    const rekap = await prisma.cuti.groupBy({
      by: ['jenis', 'alasan'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        jumlahHari: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    logger.info('CutiAgent: Rekap alasan fetched', { count: rekap.length });

    return rekap;
  }

  /**
   * Get summary cuti by karyawan
   */
  async getSummaryByKaryawan(karyawanId: string, tahun?: number) {
    logger.info('CutiAgent: Fetching summary by karyawan', { karyawanId, tahun });

    const where: {
      karyawanId: string;
      tahun?: number;
    } = {
      karyawanId,
    };

    if (tahun) where.tahun = tahun;

    const summary = await prisma.cuti.groupBy({
      by: ['jenis'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        jumlahHari: true,
      },
    });

    logger.info('CutiAgent: Summary fetched', { karyawanId });

    return summary;
  }
}

// Export singleton instance
export const cutiAgent = new CutiAgent();
