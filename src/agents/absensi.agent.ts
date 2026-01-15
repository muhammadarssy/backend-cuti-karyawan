import prisma from '../lib/prisma.js';
import { ConflictError, NotFoundError, BadRequestError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { StatusKehadiran } from '@prisma/client';
import * as XLSX from 'xlsx';

export interface FingerprintRow {
  id: number;
  nik: string;
  nama: string;
  waktu: string;
  status: string;
}

export interface ProcessFingerprintResult {
  success: number;
  failed: number;
  notFound: number;
  duplicate: number;
  details: {
    processed: string[];
    notMatched: FingerprintRow[];
    duplicates: string[];
  };
  missingEmployees: Array<{
    id: string;
    nama: string;
    nik: string;
    jabatan: string | null;
    fingerprintId: number | null;
  }>;
}

export interface CreateAbsensiManualDto {
  karyawanId: string;
  tanggal: Date;
  statusKehadiran: StatusKehadiran;
  keterangan?: string;
  diinputOleh?: string;
}

export interface BulkCreateAbsensiManualDto {
  karyawanIds: string[];
  tanggal: Date;
  statusKehadiran: StatusKehadiran;
  keterangan?: string;
  diinputOleh?: string;
}

export interface BulkCreateAbsensiResult {
  success: number;
  failed: number;
  duplicate: number;
  details: {
    created: string[];
    duplicates: string[];
    failed: Array<{ karyawanId: string; error: string }>;
  };
}

export interface UpdateAbsensiDto {
  statusKehadiran?: StatusKehadiran;
  keterangan?: string;
  diinputOleh?: string;
}

/**
 * AbsensiAgent - Business Logic untuk manajemen absensi
 */
export class AbsensiAgent {
  /**
   * Parse Excel file dari fingerprint machine
   */
  parseExcelFingerprint(buffer: Buffer): FingerprintRow[] {
    logger.info('AbsensiAgent: Parsing Excel fingerprint file');

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON dengan header di baris pertama
      const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 }) as unknown[][];
      
      // Skip header row (index 0)
      const dataRows = rawData.slice(1);
      
      const result: FingerprintRow[] = [];
      
      for (const row of dataRows) {
        // Skip empty rows
        if (!row || row.length === 0 || !row[0]) continue;
        
        // Kolom: A=No.ID, B=NIK, C=Nama, D=Waktu, E=Status
        const fingerprintRow: FingerprintRow = {
          id: parseInt(String(row[0] || '0')) || 0, // Kolom A: No. ID
          nik: String(row[1] || '').trim(), // Kolom B: NIK
          nama: String(row[2] || '').trim(), // Kolom C: Nama
          waktu: String(row[3] || '').trim(), // Kolom D: Waktu
          status: String(row[4] || '').trim(), // Kolom E: Status
        };
        
        // Validasi ID harus ada
        if (fingerprintRow.id > 0) {
          result.push(fingerprintRow);
        }
      }
      
      logger.info('AbsensiAgent: Excel parsed successfully', { totalRows: result.length });
      return result;
      
    } catch (error) {
      logger.error('AbsensiAgent: Failed to parse Excel', { error });
      throw new BadRequestError('Gagal membaca file Excel. Pastikan format file benar');
    }
  }

  /**
   * Process upload fingerprint dan buat record absensi
   */
  async processFingerprint(buffer: Buffer, tanggal: Date): Promise<ProcessFingerprintResult> {
    logger.info('AbsensiAgent: Processing fingerprint upload', { tanggal });

    // Parse Excel
    const rows = this.parseExcelFingerprint(buffer);
    
    if (rows.length === 0) {
      throw new BadRequestError('File Excel tidak memiliki data yang valid');
    }

    // Get unique fingerprint IDs
    const fingerprintIds = [...new Set(rows.map(r => r.id))];
    
    // Get karyawan yang match dengan fingerprint ID
    const karyawanMap = await prisma.karyawan.findMany({
      where: {
        fingerprintId: { in: fingerprintIds },
        status: 'AKTIF',
      },
    });

    const karyawanByFingerprintId = new Map(
      karyawanMap.map(k => [k.fingerprintId!, k])
    );

    const result: ProcessFingerprintResult = {
      success: 0,
      failed: 0,
      notFound: 0,
      duplicate: 0,
      details: {
        processed: [],
        notMatched: [],
        duplicates: [],
      },
      missingEmployees: [],
    };

    // Set tanggal ke awal hari (00:00:00)
    const tanggalNormalized = new Date(tanggal);
    tanggalNormalized.setHours(0, 0, 0, 0);

    // Process setiap row
    for (const row of rows) {
      const karyawan = karyawanByFingerprintId.get(row.id);

      if (!karyawan) {
        result.notFound++;
        result.details.notMatched.push(row);
        logger.warn('AbsensiAgent: Karyawan not found for fingerprint ID', { 
          fingerprintId: row.id,
          nama: row.nama,
        });
        continue;
      }

      try {
        // Check apakah sudah ada absensi untuk karyawan di tanggal ini
        const existing = await prisma.absensi.findUnique({
          where: {
            karyawanId_tanggal: {
              karyawanId: karyawan.id,
              tanggal: tanggalNormalized,
            },
          },
        });

        if (existing) {
          result.duplicate++;
          result.details.duplicates.push(karyawan.nama);
          logger.warn('AbsensiAgent: Absensi already exists', {
            karyawanId: karyawan.id,
            tanggal: tanggalNormalized,
          });
          continue;
        }

        // Create absensi record
        // Parse waktu untuk mendapatkan jam masuk
        let jamMasuk: Date | null = null;
        if (row.waktu) {
          try {
            // Format waktu biasanya: "2024-01-15 08:30:00" atau "08:30:00"
            const waktuStr = row.waktu.trim();
            const timeParts = waktuStr.split(' ');
            const timeOnly = timeParts.length > 1 ? timeParts[1] : timeParts[0];
            const [hours, minutes] = timeOnly.split(':').map(Number);
            
            // Create date dengan jam dari fingerprint (GMT+7)
            jamMasuk = new Date(tanggalNormalized);
            jamMasuk.setHours(hours, minutes || 0, 0, 0);
          } catch {
            logger.warn('AbsensiAgent: Failed to parse jam masuk', { waktu: row.waktu });
          }
        }

        await prisma.absensi.create({
          data: {
            karyawanId: karyawan.id,
            tanggal: tanggalNormalized,
            jam: jamMasuk,
            statusKehadiran: 'HADIR',
            isManual: false,
          },
        });

        result.success++;
        result.details.processed.push(karyawan.nama);
        
        logger.info('AbsensiAgent: Absensi created from fingerprint', {
          karyawanId: karyawan.id,
          nama: karyawan.nama,
          tanggal: tanggalNormalized,
        });

      } catch (error) {
        result.failed++;
        logger.error('AbsensiAgent: Failed to create absensi', {
          karyawanId: karyawan.id,
          error,
        });
      }
    }

    // Get all active karyawan yang tidak ada di file fingerprint
    const allActiveKaryawan = await prisma.karyawan.findMany({
      where: {
        status: 'AKTIF',
      },
      select: {
        id: true,
        nama: true,
        nik: true,
        jabatan: true,
        fingerprintId: true,
      },
    });

    // Get karyawan yang sudah ada absensi di tanggal ini
    const existingAbsensi = await prisma.absensi.findMany({
      where: {
        tanggal: tanggalNormalized,
      },
      select: {
        karyawanId: true,
      },
    });

    const karyawanWithAbsensi = new Set(existingAbsensi.map(a => a.karyawanId));

    // Filter karyawan yang tidak ada di file dan belum ada absensi
    result.missingEmployees = allActiveKaryawan
      .filter(k => !karyawanWithAbsensi.has(k.id))
      .map(k => ({
        id: k.id,
        nama: k.nama,
        nik: k.nik,
        jabatan: k.jabatan,
        fingerprintId: k.fingerprintId,
      }));

    logger.info('AbsensiAgent: Fingerprint processing completed', { 
      result: {
        ...result,
        missingEmployeesCount: result.missingEmployees.length,
      }
    });
    
    return result;
  }

  /**
   * Get karyawan yang belum absen untuk tanggal tertentu
   */
  async getKaryawanBelumAbsen(tanggal: Date) {
    logger.info('AbsensiAgent: Getting karyawan belum absen', { tanggal });

    // Normalize tanggal
    const tanggalNormalized = new Date(tanggal);
    tanggalNormalized.setHours(0, 0, 0, 0);

    const karyawanBelumAbsen = await prisma.karyawan.findMany({
      where: {
        status: 'AKTIF',
        NOT: {
          absensi: {
            some: {
              tanggal: tanggalNormalized,
            },
          },
        },
      },
      select: {
        id: true,
        nik: true,
        nama: true,
        jabatan: true,
        departemen: true,
        fingerprintId: true,
      },
      orderBy: { nama: 'asc' },
    });

    logger.info('AbsensiAgent: Karyawan belum absen found', { 
      count: karyawanBelumAbsen.length 
    });

    return karyawanBelumAbsen;
  }

  /**
   * Create absensi manual (untuk sakit, izin, WFH, dll)
   */
  async createManual(data: CreateAbsensiManualDto) {
    logger.info('AbsensiAgent: Creating manual absensi', {
      karyawanId: data.karyawanId,
      tanggal: data.tanggal,
      status: data.statusKehadiran,
    });

    // Normalize tanggal
    const tanggalNormalized = new Date(data.tanggal);
    tanggalNormalized.setHours(0, 0, 0, 0);

    // Check karyawan exists dan aktif
    const karyawan = await prisma.karyawan.findUnique({
      where: { id: data.karyawanId },
    });

    if (!karyawan) {
      throw new NotFoundError('Karyawan tidak ditemukan');
    }

    if (karyawan.status !== 'AKTIF') {
      throw new BadRequestError('Karyawan tidak aktif');
    }

    // Check duplikasi
    const existing = await prisma.absensi.findUnique({
      where: {
        karyawanId_tanggal: {
          karyawanId: data.karyawanId,
          tanggal: tanggalNormalized,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Absensi untuk tanggal ini sudah ada');
    }

    // Create absensi
    const absensi = await prisma.absensi.create({
      data: {
        karyawanId: data.karyawanId,
        tanggal: tanggalNormalized,
        statusKehadiran: data.statusKehadiran,
        isManual: true,
        keterangan: data.keterangan,
        diinputOleh: data.diinputOleh,
      },
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
    });

    logger.info('AbsensiAgent: Manual absensi created', { id: absensi.id });
    return absensi;
  }

  /**
   * Bulk create absensi manual untuk multiple karyawan sekaligus
   */
  async bulkCreateManual(data: BulkCreateAbsensiManualDto): Promise<BulkCreateAbsensiResult> {
    logger.info('AbsensiAgent: Bulk creating manual absensi', {
      karyawanCount: data.karyawanIds.length,
      tanggal: data.tanggal,
      status: data.statusKehadiran,
    });

    // Normalize tanggal
    const tanggalNormalized = new Date(data.tanggal);
    tanggalNormalized.setHours(0, 0, 0, 0);

    const result: BulkCreateAbsensiResult = {
      success: 0,
      failed: 0,
      duplicate: 0,
      details: {
        created: [],
        duplicates: [],
        failed: [],
      },
    };

    // Get all karyawan in one query
    const karyawanList = await prisma.karyawan.findMany({
      where: {
        id: { in: data.karyawanIds },
        status: 'AKTIF',
      },
      select: {
        id: true,
        nama: true,
      },
    });

    const karyawanMap = new Map(karyawanList.map(k => [k.id, k]));

    // Check existing absensi for this date
    const existingAbsensi = await prisma.absensi.findMany({
      where: {
        karyawanId: { in: data.karyawanIds },
        tanggal: tanggalNormalized,
      },
      select: {
        karyawanId: true,
        karyawan: {
          select: {
            nama: true,
          },
        },
      },
    });

    const existingKaryawanIds = new Set(existingAbsensi.map(a => a.karyawanId));

    // Process each karyawan
    for (const karyawanId of data.karyawanIds) {
      const karyawan = karyawanMap.get(karyawanId);

      // Check if karyawan exists and active
      if (!karyawan) {
        result.failed++;
        result.details.failed.push({
          karyawanId,
          error: 'Karyawan tidak ditemukan atau tidak aktif',
        });
        continue;
      }

      // Check if already has absensi
      if (existingKaryawanIds.has(karyawanId)) {
        result.duplicate++;
        result.details.duplicates.push(karyawan.nama);
        logger.warn('AbsensiAgent: Absensi already exists for karyawan', {
          karyawanId,
          tanggal: tanggalNormalized,
        });
        continue;
      }

      try {
        // Create absensi
        await prisma.absensi.create({
          data: {
            karyawanId: karyawanId,
            tanggal: tanggalNormalized,
            statusKehadiran: data.statusKehadiran,
            isManual: true,
            keterangan: data.keterangan,
            diinputOleh: data.diinputOleh,
          },
        });

        result.success++;
        result.details.created.push(karyawan.nama);

        logger.info('AbsensiAgent: Bulk absensi created', {
          karyawanId,
          nama: karyawan.nama,
        });
      } catch (error) {
        result.failed++;
        result.details.failed.push({
          karyawanId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        logger.error('AbsensiAgent: Failed to create bulk absensi', {
          karyawanId,
          error,
        });
      }
    }

    logger.info('AbsensiAgent: Bulk create completed', { result });
    return result;
  }

  /**
   * Get absensi by ID
   */
  async findById(id: string) {
    logger.info('AbsensiAgent: Fetching absensi by ID', { id });

    const absensi = await prisma.absensi.findUnique({
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
      },
    });

    if (!absensi) {
      throw new NotFoundError('Absensi tidak ditemukan');
    }

    return absensi;
  }

  /**
   * Get absensi dengan filter
   */
  async findAll(
    tanggalMulai?: Date,
    tanggalSelesai?: Date,
    karyawanId?: string,
    statusKehadiran?: StatusKehadiran,
    isManual?: boolean,
    page: number = 1,
    limit: number = 50
  ) {
    logger.info('AbsensiAgent: Fetching absensi with filters', {
      tanggalMulai,
      tanggalSelesai,
      karyawanId,
      statusKehadiran,
      isManual,
      page,
      limit,
    });

    interface WhereClause {
      tanggal?: {
        gte?: Date;
        lte?: Date;
      };
      karyawanId?: string;
      statusKehadiran?: StatusKehadiran;
      isManual?: boolean;
    }

    const where: WhereClause = {};

    if (tanggalMulai || tanggalSelesai) {
      where.tanggal = {};
      if (tanggalMulai) {
        const start = new Date(tanggalMulai);
        start.setHours(0, 0, 0, 0);
        where.tanggal.gte = start;
      }
      if (tanggalSelesai) {
        const end = new Date(tanggalSelesai);
        end.setHours(23, 59, 59, 999);
        where.tanggal.lte = end;
      }
    }

    if (karyawanId) where.karyawanId = karyawanId;
    if (statusKehadiran) where.statusKehadiran = statusKehadiran;
    if (isManual !== undefined) where.isManual = isManual;

    const skip = (page - 1) * limit;

    const [absensi, total] = await Promise.all([
      prisma.absensi.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ tanggal: 'desc' }, { karyawan: { nama: 'asc' } }],
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
      prisma.absensi.count({ where }),
    ]);

    return {
      data: absensi,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update absensi (hanya yang manual)
   */
  async update(id: string, data: UpdateAbsensiDto) {
    logger.info('AbsensiAgent: Updating absensi', { id });

    const existing = await this.findById(id);

    if (!existing.isManual) {
      throw new BadRequestError('Hanya absensi manual yang bisa diubah');
    }

    const absensi = await prisma.absensi.update({
      where: { id },
      data: {
        statusKehadiran: data.statusKehadiran,
        keterangan: data.keterangan,
        diinputOleh: data.diinputOleh,
      },
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
    });

    logger.info('AbsensiAgent: Absensi updated', { id });
    return absensi;
  }

  /**
   * Delete absensi
   */
  async delete(id: string) {
    logger.info('AbsensiAgent: Deleting absensi', { id });

    await this.findById(id);

    await prisma.absensi.delete({
      where: { id },
    });

    logger.info('AbsensiAgent: Absensi deleted', { id });
  }

  /**
   * Get ringkasan absensi untuk periode tertentu
   */
  async getRingkasan(tanggalMulai: Date, tanggalSelesai: Date, karyawanId?: string) {
    logger.info('AbsensiAgent: Getting ringkasan absensi', {
      tanggalMulai,
      tanggalSelesai,
      karyawanId,
    });

    interface WhereRingkasan {
      tanggal: {
        gte: Date;
        lte: Date;
      };
      karyawanId?: string;
    }

    const where: WhereRingkasan = {
      tanggal: {
        gte: new Date(tanggalMulai),
        lte: new Date(tanggalSelesai),
      },
    };

    if (karyawanId) {
      where.karyawanId = karyawanId;
    }

    const absensi = await prisma.absensi.groupBy({
      by: ['statusKehadiran'],
      where,
      _count: true,
    });

    const ringkasan = absensi.reduce((acc: Record<string, number>, item: { statusKehadiran: string; _count: number }) => {
      acc[item.statusKehadiran] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return ringkasan;
  }

  /**
   * Export absensi to Excel
   * Menampilkan semua karyawan aktif dengan data absensi mereka
   */
  async exportToExcel(tanggalMulai: Date, tanggalSelesai: Date): Promise<Buffer> {
    logger.info('AbsensiAgent: Exporting absensi to Excel', { tanggalMulai, tanggalSelesai });

    // Normalize dates to start and end of day
    const startDate = new Date(tanggalMulai);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(tanggalSelesai);
    endDate.setHours(23, 59, 59, 999);

    // Get all active employees
    const karyawan = await prisma.karyawan.findMany({
      where: { status: 'AKTIF' },
      orderBy: { nama: 'asc' },
    });

    // Get all absensi in the period
    const absensi = await prisma.absensi.findMany({
      where: {
        tanggal: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        karyawan: true,
      },
      orderBy: [{ tanggal: 'asc' }, { karyawan: { nama: 'asc' } }],
    });

    logger.info('AbsensiAgent: Query results', {
      totalKaryawan: karyawan.length,
      totalAbsensi: absensi.length,
    });

    // Create map for quick lookup
    const absensiMap = new Map<string, typeof absensi[0]>();
    for (const abs of absensi) {
      // Format date as YYYY-MM-DD in local timezone
      const year = abs.tanggal.getFullYear();
      const month = String(abs.tanggal.getMonth() + 1).padStart(2, '0');
      const day = String(abs.tanggal.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const key = `${abs.karyawanId}-${dateStr}`;
      absensiMap.set(key, abs);
    }

    // Collect unique statuses for debugging
    const uniqueStatuses = new Set(absensi.map(a => a.statusKehadiran));
    
    logger.info('AbsensiAgent: Map created', {
      mapSize: absensiMap.size,
      sampleKeys: Array.from(absensiMap.keys()).slice(0, 3),
      uniqueStatuses: Array.from(uniqueStatuses),
    });

    // Generate rows for Excel
    const rows: unknown[][] = [];
    
    // Header row
    rows.push([
      'Tanggal',
      'NIK',
      'Nama',
      'Jam Masuk',
      'Status',
      'Sumber',
      'Keterangan',
      'Remark',
    ]);

    // Generate dates in period
    const dates: Date[] = [];
    const current = new Date(tanggalMulai);
    while (current <= tanggalSelesai) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    // For each employee, for each date
    for (const k of karyawan) {
      for (const date of dates) {
        // Format date as YYYY-MM-DD in local timezone
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const key = `${k.id}-${dateStr}`;
        const abs = absensiMap.get(key);

        let jamMasuk = '-';
        let remark = '';

        if (abs?.jam) {
          const jamDate = new Date(abs.jam);
          const hours = jamDate.getHours();
          const minutes = jamDate.getMinutes();
          jamMasuk = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

          // Check if late (> 08:15) and status is HADIR
          if (abs.statusKehadiran === 'HADIR' && (hours > 8 || (hours === 8 && minutes > 15))) {
            remark = 'TELAT';
          }
        }

        rows.push([
          dateStr,
          k.nik,
          k.nama,
          jamMasuk,
          abs ? abs.statusKehadiran : '-',
          abs ? (abs.isManual ? 'Manual' : 'Fingerprint') : '-',
          abs?.keterangan || '-',
          remark,
        ]);
      }
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Tanggal
      { wch: 15 }, // NIK
      { wch: 25 }, // Nama
      { wch: 12 }, // Jam Masuk
      { wch: 20 }, // Status
      { wch: 12 }, // Sumber
      { wch: 30 }, // Keterangan
      { wch: 10 }, // Remark
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Absensi');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    logger.info('AbsensiAgent: Excel export completed', {
      totalKaryawan: karyawan.length,
      totalDays: dates.length,
      totalRows: rows.length - 1,
    });

    return buffer;
  }
}

// Export singleton instance
export const absensiAgent = new AbsensiAgent();
