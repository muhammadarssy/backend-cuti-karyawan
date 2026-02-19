import prisma from '../lib/prisma.js';
import { BadRequestError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

/**
 * Struktur kolom Excel rekap dari mesin absensi:
 * Emp No. | No. ID | NIK | Nama | Auto-Assign | Tanggal | Jam Kerja | Jam Masuk | Jam Pulang | Scan Masuk | Scan Pulang
 * Idx: 0  | 1      | 2   | 3    | 4           | 5       | 6         | 7         | 8          | 9          | 10
 *
 * Matching ke fingerprintId karyawan menggunakan kolom No. ID (idx 1)
 */
export interface RekapRow {
  empNo: string;
  noId: string; // digunakan untuk matching fingerprintId
  nik: string;
  nama: string;
  autoAssign: string;
  tanggal: string;
  jamKerja: string;
  jamMasuk: string;
  jamPulang: string;
  scanMasuk: string;
  scanPulang: string;
}

export interface RekapAbsensiItem {
  empNo: string;
  noId: string;
  karyawanId: string | null;
  nik: string;
  nama: string;
  tanggal: string;         // YYYY-MM-DD
  jamMasuk: string | null; // HH:MM atau null jika kosong
  jamPulang: string | null;
  jamKerja: string | null;
  scanMasuk: string | null;
  scanPulang: string | null;
  keterangan: string | null; // bisa diisi user di frontend
}

export interface ParseRekapResult {
  data: RekapAbsensiItem[];
  notMatched: Array<{ empNo: string; nama: string; nik: string }>;
  totalRows: number;
  matchedRows: number;
  notMatchedRows: number;
}

export interface ExportRekapDto {
  data: RekapAbsensiItem[];
  periodeLabel?: string; // opsional, misal "Februari 2026"
}

/**
 * AbsensiRekapAgent - Business Logic untuk rekap absensi dari mesin
 * Data TIDAK disimpan ke database, hanya diproses dan dikembalikan ke frontend
 */
export class AbsensiRekapAgent {
  /**
   * Parse Excel rekap absensi dari mesin
   * Kolom: Emp No. | No. ID | NIK | Nama | Auto-Assign | Tanggal | Jam Kerja | Jam Masuk | Jam Pulang | Scan Masuk | Scan Pulang
   */
  parseExcelRekap(buffer: Buffer): RekapRow[] {
    logger.info('AbsensiRekapAgent: Parsing Excel rekap file');

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        raw: false,
        dateNF: 'YYYY-MM-DD',
      }) as unknown[][];

      // Skip header row (index 0)
      const dataRows = rawData.slice(1);

      const result: RekapRow[] = [];

      for (const row of dataRows) {
        if (!row || !Array.isArray(row) || row.length === 0) continue;

        const empNo = String(row[0] ?? '').trim();
        if (!empNo) continue; // skip baris kosong

        result.push({
          empNo,
          noId: String(row[1] ?? '').trim(),
          nik: String(row[2] ?? '').trim(),
          nama: String(row[3] ?? '').trim(),
          autoAssign: String(row[4] ?? '').trim(),
          tanggal: String(row[5] ?? '').trim(),
          jamKerja: String(row[6] ?? '').trim(),
          jamMasuk: String(row[7] ?? '').trim(),
          jamPulang: String(row[8] ?? '').trim(),
          scanMasuk: String(row[9] ?? '').trim(),
          scanPulang: String(row[10] ?? '').trim(),
        });
      }

      logger.info('AbsensiRekapAgent: Excel parsed', { totalRows: result.length });
      return result;
    } catch (error) {
      logger.error('AbsensiRekapAgent: Failed to parse Excel', { error });
      throw new BadRequestError('Gagal membaca file Excel. Pastikan format file benar');
    }
  }

  /**
   * Normalkan string waktu menjadi "HH:MM" atau null jika kosong/tidak valid
   * Mendukung format: "08:30", "08:30:00", "2026-02-01 08:30:00"
   */
  private normalizeTime(raw: string): string | null {
    if (!raw || raw === '' || raw === '-') return null;
    const trimmed = raw.trim();

    // Format datetime: "2026-02-01 08:30:00"
    const datetimeMatch = trimmed.match(/\d{4}-\d{2}-\d{2}\s+(\d{2}:\d{2})/);
    if (datetimeMatch) return datetimeMatch[1];

    // Format time saja: "08:30:00" atau "08:30"
    const timeMatch = trimmed.match(/^(\d{2}:\d{2})/);
    if (timeMatch) return timeMatch[1];

    return null;
  }

  /**
   * Normalkan string tanggal menjadi "YYYY-MM-DD" atau null
   * Mendukung format: "2026-02-01", "01/02/2026", "1/2/2026"
   */
  private normalizeDate(raw: string): string | null {
    if (!raw || raw === '') return null;
    const trimmed = raw.trim();

    // Sudah format ISO
    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    // Format DD/MM/YYYY atau D/M/YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    return null;
  }

  /**
   * Upload dan proses rekap absensi:
   * 1. Parse Excel
   * 2. Cocokkan Emp No. dengan fingerprintId karyawan aktif
   * 3. Return data terstruktur siap tabel (tidak disimpan ke DB)
   */
  async processRekap(buffer: Buffer): Promise<ParseRekapResult> {
    logger.info('AbsensiRekapAgent: Processing rekap upload');

    const rows = this.parseExcelRekap(buffer);

    if (rows.length === 0) {
      throw new BadRequestError('File Excel tidak memiliki data yang valid');
    }

    // Ambil semua unique No. ID dari file (digunakan untuk matching fingerprintId)
    const noIds = [...new Set(rows.map(r => r.noId).filter(Boolean))];

    // Konversi noId ke number untuk match dengan fingerprintId (integer di DB)
    const fingerprintIds = noIds
      .map(e => parseInt(e))
      .filter(n => !isNaN(n));

    // Query karyawan aktif yang cocok dengan fingerprintId
    const karyawanList = await prisma.karyawan.findMany({
      where: {
        fingerprintId: { in: fingerprintIds },
        status: 'AKTIF',
      },
      select: {
        id: true,
        nik: true,
        nama: true,
        fingerprintId: true,
      },
    });

    // Map fingerprintId -> karyawan
    const karyawanByFingerprintId = new Map(
      karyawanList.map(k => [k.fingerprintId!, k])
    );

    logger.info('AbsensiRekapAgent: Karyawan matched', {
      totalNoIds: noIds.length,
      matched: karyawanList.length,
    });

    const data: RekapAbsensiItem[] = [];
    const notMatchedMap = new Map<string, { empNo: string; nama: string; nik: string }>();

    for (const row of rows) {
      const noIdInt = parseInt(row.noId);
      const karyawan = isNaN(noIdInt) ? undefined : karyawanByFingerprintId.get(noIdInt);

      if (!karyawan) {
        notMatchedMap.set(row.noId, {
          empNo: row.empNo,
          nama: row.nama,
          nik: row.nik,
        });
      }

      const tanggalNorm = this.normalizeDate(row.tanggal);

      data.push({
        empNo: row.empNo,
        noId: row.noId,
        karyawanId: karyawan?.id ?? null,
        nik: karyawan?.nik ?? row.nik,
        nama: karyawan?.nama ?? row.nama,
        tanggal: tanggalNorm ?? row.tanggal,
        jamMasuk: this.normalizeTime(row.jamMasuk),
        jamPulang: this.normalizeTime(row.jamPulang),
        jamKerja: row.jamKerja || null,
        scanMasuk: this.normalizeTime(row.scanMasuk),
        scanPulang: this.normalizeTime(row.scanPulang),
        keterangan: null,
      });
    }

    data.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

    const notMatched = Array.from(notMatchedMap.values());

    logger.info('AbsensiRekapAgent: Process completed', {
      total: data.length,
      matched: data.filter(d => d.karyawanId).length,
      notMatched: notMatched.length,
    });

    return {
      data,
      notMatched,
      totalRows: data.length,
      matchedRows: data.filter(d => d.karyawanId !== null).length,
      notMatchedRows: notMatched.length,
    };
  }

  /**
   * Export data rekap ke Excel
   * Data diterima dari frontend (sudah diedit user), dikembalikan sebagai buffer
   */
  async exportToExcel(payload: ExportRekapDto): Promise<Buffer> {
    logger.info('AbsensiRekapAgent: Exporting rekap to Excel', {
      totalRows: payload.data.length,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rekap Absensi');

    // Header
    worksheet.columns = [
      { header: 'No.', key: 'no', width: 5 },
      { header: 'Nama', key: 'nama', width: 28 },
      { header: 'Tanggal', key: 'tanggal', width: 14 },
      { header: 'Masuk', key: 'scanMasuk', width: 12 },
      { header: 'Pulang', key: 'scanPulang', width: 12 },
      { header: 'Keterangan', key: 'keterangan', width: 30 },
    ];

    // Style header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F75B6' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 20;

    // Data rows
    payload.data.forEach((item, idx) => {
      const row = worksheet.addRow({
        no: idx + 1,
        nama: item.nama,
        tanggal: item.tanggal.split('-').reverse().join('-'),
        scanMasuk: item.scanMasuk ?? '-',
        scanPulang: item.scanPulang ?? '-',
        keterangan: item.keterangan ?? '',
      });

      // Zebra stripe
      if (idx % 2 === 1) {
        for (let col = 1; col <= 6; col++) {
          row.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' },
          };
        }
      }

      // Highlight baris yang tidak matched (karyawanId null)
      if (!item.karyawanId) {
        for (let col = 1; col <= 6; col++) {
          row.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF2CC' }, // kuning muda
          };
        }
      }
    });

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Auto border seluruh tabel
    const totalRows = payload.data.length + 1;
    for (let r = 1; r <= totalRows; r++) {
      for (let c = 1; c <= 6; c++) {
        const cell = worksheet.getRow(r).getCell(c);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }

    if (payload.periodeLabel) {
      worksheet.headerFooter.oddHeader = `&C&B${payload.periodeLabel}`;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    logger.info('AbsensiRekapAgent: Excel export done', { rows: payload.data.length });
    return Buffer.from(buffer);
  }

  /**
   * Export data rekap ke PDF-ready JSON
   * Karena tidak ada lib PDF yang diinstall, endpoint ini mengembalikan
   * JSON terstruktur yang siap di-render oleh frontend menjadi PDF
   * (misal menggunakan jsPDF, Puppeteer, atau react-pdf di sisi client)
   */
  exportToPdfPayload(payload: ExportRekapDto): object {
    logger.info('AbsensiRekapAgent: Preparing PDF payload', {
      totalRows: payload.data.length,
    });

    // Group by tanggal untuk layout tabel per hari
    const grouped: Record<string, RekapAbsensiItem[]> = {};
    for (const item of payload.data) {
      const key = item.tanggal;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    return {
      periodeLabel: payload.periodeLabel ?? null,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRecords: payload.data.length,
        totalKaryawan: new Set(payload.data.map(d => d.nik)).size,
        totalTanggal: Object.keys(grouped).length,
      },
      columns: [
        { key: 'no', label: 'No.' },
        { key: 'nama', label: 'Nama' },
        { key: 'tanggal', label: 'Tanggal' },
        { key: 'scanMasuk', label: 'Masuk' },
        { key: 'scanPulang', label: 'Pulang' },
        { key: 'keterangan', label: 'Keterangan' },
      ],
      rows: payload.data.map((item, idx) => ({
        no: idx + 1,
        noId: item.noId,
        empNo: item.empNo,
        nik: item.nik,
        nama: item.nama,
        tanggal: item.tanggal.split('-').reverse().join('-'),
        scanMasuk: item.scanMasuk ?? '-',
        scanPulang: item.scanPulang ?? '-',
        jamKerja: item.jamKerja ?? '-',
        keterangan: item.keterangan ?? '',
        _meta: {
          karyawanId: item.karyawanId,
          isMatched: item.karyawanId !== null,
        },
      })),
    };
  }
}

export const absensiRekapAgent = new AbsensiRekapAgent();
