import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { absensiRekapAgent } from '../agents/absensi-rekap.agent.js';
import { successResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { BadRequestError } from '../utils/errors.js';
import type { RekapAbsensiItem } from '../agents/absensi-rekap.agent.js';

// Schema validasi untuk item rekap yang dikirim dari frontend
const rekapItemSchema = z.object({
  empNo: z.string(),
  noId: z.string(),
  karyawanId: z.string().nullable(),
  nik: z.string(),
  nama: z.string(),
  tanggal: z.string(),
  jamMasuk: z.string().nullable(),
  jamPulang: z.string().nullable(),
  jamKerja: z.string().nullable(),
  scanMasuk: z.string().nullable(),
  scanPulang: z.string().nullable(),
  keterangan: z.string().nullable(),
});

const exportPayloadSchema = z.object({
  data: z.array(rekapItemSchema).min(1, 'Data tidak boleh kosong'),
  periodeLabel: z.string().optional(),
});

/**
 * AbsensiRekapController - Handler untuk rekap absensi dari mesin
 * Data tidak disimpan ke DB, hanya diproses dan dikembalikan
 */
export class AbsensiRekapController {
  /**
   * POST /api/absensi-rekap/upload
   * Upload file Excel rekap dari mesin, return data terstruktur untuk tabel
   */
  async uploadRekap(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('AbsensiRekapController: Upload rekap request');

      if (!req.file) {
        throw new BadRequestError('File Excel wajib diupload');
      }

      const result = await absensiRekapAgent.processRekap(req.file.buffer);

      logger.info('AbsensiRekapController: Rekap processed', {
        totalRows: result.totalRows,
        matched: result.matchedRows,
        notMatched: result.notMatchedRows,
      });

      res.json(
        successResponse('File rekap berhasil diproses', result)
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/absensi-rekap/export/excel
   * Terima data dari frontend (sudah diedit), return file Excel untuk didownload
   */
  async exportExcel(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('AbsensiRekapController: Export to Excel request');

      const validated = exportPayloadSchema.parse(req.body);

      const buffer = await absensiRekapAgent.exportToExcel({
        data: validated.data as RekapAbsensiItem[],
        periodeLabel: validated.periodeLabel,
      });

      const filename = `Rekap_Absensi${validated.periodeLabel ? '_' + validated.periodeLabel.replace(/\s+/g, '_') : ''}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/absensi-rekap/export/pdf
   * Terima data dari frontend (sudah diedit), return JSON payload siap render PDF di frontend
   */
  async exportPdf(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('AbsensiRekapController: Export to PDF payload request');

      const validated = exportPayloadSchema.parse(req.body);

      const payload = absensiRekapAgent.exportToPdfPayload({
        data: validated.data as RekapAbsensiItem[],
        periodeLabel: validated.periodeLabel,
      });

      res.json(
        successResponse('PDF payload berhasil dibuat', payload)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const absensiRekapController = new AbsensiRekapController();
