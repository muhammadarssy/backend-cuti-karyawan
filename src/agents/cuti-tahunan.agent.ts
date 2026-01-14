import prisma from '../lib/prisma.js';
import { BusinessLogicError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { getYearFromDate, getCurrentYear } from '../utils/date.js';
import type { TipeCutiTahunan } from '@prisma/client';

/**
 * CutiTahunanAgent - Business Logic untuk pengelolaan hak cuti tahunan
 */
export class CutiTahunanAgent {
  /**
   * Generate hak cuti tahunan untuk karyawan
   * Dipanggil saat awal tahun atau manual oleh admin
   */
  async generateCutiTahunan(karyawanId: string, tahun: number) {
    logger.info('CutiTahunanAgent: Generating cuti tahunan', { karyawanId, tahun });

    // Cek apakah karyawan ada
    const karyawan = await prisma.karyawan.findUnique({
      where: { id: karyawanId },
    });

    if (!karyawan) {
      throw new NotFoundError('Karyawan tidak ditemukan');
    }

    if (karyawan.status !== 'AKTIF') {
      throw new BusinessLogicError('Karyawan tidak aktif');
    }

    // Cek apakah sudah ada data cuti untuk tahun ini
    const existing = await prisma.cutiTahunan.findUnique({
      where: {
        karyawanId_tahun: {
          karyawanId,
          tahun,
        },
      },
    });

    if (existing) {
      logger.warn('CutiTahunanAgent: Cuti tahunan already exists', { karyawanId, tahun });
      throw new BusinessLogicError(`Data cuti tahunan untuk tahun ${tahun} sudah ada`);
    }

    // Ambil data cuti tahun sebelumnya untuk carry forward
    const previousYear = await prisma.cutiTahunan.findUnique({
      where: {
        karyawanId_tahun: {
          karyawanId,
          tahun: tahun - 1,
        },
      },
    });

    const carryForward = previousYear?.sisaCuti && previousYear.sisaCuti > 0 ? previousYear.sisaCuti : 0;

    // Tentukan jatah dasar dan tipe berdasarkan tahun kerja
    const tahunMasukKaryawan = getYearFromDate(karyawan.tanggalMasuk);
    const bulanMasuk = karyawan.tanggalMasuk.getMonth() + 1; // 1-12
    const tahunKerja = tahun - tahunMasukKaryawan + 1; // Tahun ke-berapa bekerja
    
    let jatahDasar = 12;
    let tipe: TipeCutiTahunan = 'FULL';

    // Logic baru untuk menentukan jatah cuti:
    // - Tahun 1 (tahun pertama): 0 hari (PROBATION)
    // - Tahun 2 (setelah 1 tahun): 12 hari (FULL)
    // - Tahun 3+: Prorate berdasarkan bulan masuk (12 - bulan + 1)
    if (tahunKerja === 1) {
      // Tahun pertama kerja = tidak dapat cuti
      jatahDasar = 0;
      tipe = 'PROBATION';
    } else if (tahunKerja === 2) {
      // Tahun kedua = dapat 12 hari penuh
      jatahDasar = 12;
      tipe = 'FULL';
    } else {
      // Tahun ketiga dan seterusnya = prorate berdasarkan bulan masuk
      jatahDasar = 12 - bulanMasuk + 1;
      tipe = 'PRORATE';
    }

    // Hitung cuti yang sudah terpakai sebelum generate (bisa negatif)
    const cutiTerpakai = await prisma.cuti.aggregate({
      where: {
        karyawanId,
        tahun,
        jenis: 'TAHUNAN',
      },
      _sum: {
        jumlahHari: true,
      },
    });

    const cutiTerpakaiTotal = cutiTerpakai._sum.jumlahHari || 0;

    // Hitung total hak cuti
    const totalHakCuti = jatahDasar + carryForward;
    // Sisa cuti = total hak - yang sudah terpakai (bisa negatif)
    const sisaCuti = totalHakCuti - cutiTerpakaiTotal;

    // Simpan data cuti tahunan
    const cutiTahunan = await prisma.cutiTahunan.create({
      data: {
        karyawanId,
        tahun,
        jatahDasar,
        carryForward,
        totalHakCuti,
        cutiTerpakai: cutiTerpakaiTotal,
        sisaCuti,
        tipe,
      },
    });

    logger.info('CutiTahunanAgent: Cuti tahunan generated', {
      id: cutiTahunan.id,
      karyawanId,
      tahun,
      jatahDasar,
      carryForward,
      totalHakCuti,
      cutiTerpakaiTotal,
      sisaCuti,
    });

    return cutiTahunan;
  }

  /**
   * Generate cuti tahunan untuk semua karyawan aktif
   */
  async generateCutiTahunanBulk(tahun?: number) {
    const targetTahun = tahun || getCurrentYear();
    logger.info('CutiTahunanAgent: Generating bulk cuti tahunan', { tahun: targetTahun });

    // Ambil semua karyawan aktif
    const karyawanList = await prisma.karyawan.findMany({
      where: { status: 'AKTIF' },
    });

    const results = {
      success: [] as string[],
      failed: [] as { karyawanId: string; error: string }[],
    };

    for (const karyawan of karyawanList) {
      try {
        await this.generateCutiTahunan(karyawan.id, targetTahun);
        results.success.push(karyawan.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({
          karyawanId: karyawan.id,
          error: errorMessage,
        });
        logger.error('CutiTahunanAgent: Failed to generate for karyawan', {
          karyawanId: karyawan.id,
          error: errorMessage,
        });
      }
    }

    logger.info('CutiTahunanAgent: Bulk generation completed', {
      total: karyawanList.length,
      success: results.success.length,
      failed: results.failed.length,
    });

    return results;
  }

  /**
   * Get cuti tahunan by ID
   */
  async findById(id: string) {
    logger.info('CutiTahunanAgent: Fetching cuti tahunan by ID', { id });

    const cutiTahunan = await prisma.cutiTahunan.findUnique({
      where: { id },
      include: {
        karyawan: true,
        cuti: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cutiTahunan) {
      logger.warn('CutiTahunanAgent: Cuti tahunan not found', { id });
      throw new NotFoundError('Data cuti tahunan tidak ditemukan');
    }

    return cutiTahunan;
  }

  /**
   * Get cuti tahunan by karyawan and tahun
   */
  async findByKaryawanAndTahun(karyawanId: string, tahun: number) {
    logger.info('CutiTahunanAgent: Fetching cuti tahunan', { karyawanId, tahun });

    const cutiTahunan = await prisma.cutiTahunan.findUnique({
      where: {
        karyawanId_tahun: {
          karyawanId,
          tahun,
        },
      },
      include: {
        karyawan: true,
      },
    });

    if (!cutiTahunan) {
      logger.warn('CutiTahunanAgent: Cuti tahunan not found', { karyawanId, tahun });
      throw new NotFoundError(`Data cuti tahunan untuk tahun ${tahun} tidak ditemukan`);
    }

    return cutiTahunan;
  }

  /**
   * Get rekap cuti tahunan dengan filter
   */
  async getRekapCutiTahunan(tahun?: number, karyawanId?: string, page: number = 1, limit: number = 20) {
    const currentYear = tahun || getCurrentYear();

    logger.info('CutiTahunanAgent: Getting rekap cuti tahunan', {
      tahun: currentYear,
      karyawanId,
      page,
      limit,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      tahun: currentYear,
    };

    if (karyawanId) {
      where.karyawanId = karyawanId;
    }

    const skip = (page - 1) * limit;

    const [rekap, total] = await Promise.all([
      prisma.cutiTahunan.findMany({
        where,
        skip,
        take: limit,
        include: {
          karyawan: {
            select: {
              id: true,
              nik: true,
              nama: true,
              jabatan: true,
              departemen: true,
              tanggalMasuk: true,
              status: true,
            },
          },
          cuti: {
            select: {
              id: true,
              tanggalMulai: true,
              tanggalSelesai: true,
              jumlahHari: true,
            },
          },
        },
        orderBy: {
          tahun: 'desc',
        },
      }),
      prisma.cutiTahunan.count({ where }),
    ]);

    logger.info('CutiTahunanAgent: Rekap fetched', { count: rekap.length, total });

    return {
      data: rekap,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update saldo cuti (dipanggil saat cuti dicatat atau dihapus)
   */
  async updateSaldo(cutiTahunanId: string, jumlahHari: number, operation: 'add' | 'subtract') {
    logger.info('CutiTahunanAgent: Updating saldo', {
      cutiTahunanId,
      jumlahHari,
      operation,
    });

    const cutiTahunan = await this.findById(cutiTahunanId);

    // Tidak perlu validasi saldo, biarkan bisa negatif
    // Karyawan bisa menggunakan cuti sebelum dapat jatah

    const newCutiTerpakai =
      operation === 'subtract'
        ? cutiTahunan.cutiTerpakai + jumlahHari
        : cutiTahunan.cutiTerpakai - jumlahHari;

    const newSisaCuti = cutiTahunan.totalHakCuti - newCutiTerpakai;

    const updated = await prisma.cutiTahunan.update({
      where: { id: cutiTahunanId },
      data: {
        cutiTerpakai: newCutiTerpakai,
        sisaCuti: newSisaCuti,
      },
    });

    logger.info('CutiTahunanAgent: Saldo updated', {
      cutiTahunanId,
      newCutiTerpakai,
      newSisaCuti,
    });

    return updated;
  }
}

// Export singleton instance
export const cutiTahunanAgent = new CutiTahunanAgent();
