import { Router } from 'express';
import multer from 'multer';
import { absensiRekapController } from '../controllers/absensi-rekap.controller.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Max 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xls, .xlsx) are allowed'));
    }
  },
});

/**
 * Absensi Rekap Routes
 * Base path: /api/absensi-rekap
 *
 * Flow:
 * 1. POST /upload          → parse Excel → return JSON untuk tabel di frontend
 * 2. (user edit di frontend)
 * 3. POST /export/excel    → return file .xlsx
 *    POST /export/pdf      → return JSON payload siap render PDF di frontend
 */

// POST /api/absensi-rekap/upload
// Upload file Excel rekap dari mesin absensi
router.post(
  '/upload',
  upload.single('file'),
  (req, res, next) => absensiRekapController.uploadRekap(req, res, next)
);

// POST /api/absensi-rekap/export/excel
// Export data (setelah diedit user) ke file Excel
router.post(
  '/export/excel',
  (req, res, next) => absensiRekapController.exportExcel(req, res, next)
);

// POST /api/absensi-rekap/export/pdf
// Return JSON payload terstruktur untuk render PDF di frontend
router.post(
  '/export/pdf',
  (req, res, next) => absensiRekapController.exportPdf(req, res, next)
);

export default router;
