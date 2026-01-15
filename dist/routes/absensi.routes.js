import { Router } from 'express';
import multer from 'multer';
import { absensiController } from '../controllers/absensi.controller.js';
const router = Router();
// Setup multer untuk handle file upload (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // Max 5MB
    },
    fileFilter: (req, file, cb) => {
        // Accept Excel files only
        const allowedMimes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only Excel files (.xls, .xlsx) are allowed'));
        }
    },
});
/**
 * Absensi Routes
 * Base path: /api/absensi
 */
// POST /api/absensi/upload-fingerprint - Upload file fingerprint
router.post('/upload-fingerprint', upload.single('file'), (req, res, next) => absensiController.uploadFingerprint(req, res, next));
// GET /api/absensi/belum-absen - Get karyawan yang belum absen
router.get('/belum-absen', (req, res, next) => absensiController.getKaryawanBelumAbsen(req, res, next));
// GET /api/absensi/ringkasan - Get ringkasan absensi
router.get('/ringkasan', (req, res, next) => absensiController.getRingkasan(req, res, next));
// GET /api/absensi/export - Export absensi to Excel
router.get('/export', (req, res, next) => absensiController.exportToExcel(req, res, next));
// POST /api/absensi/manual - Create absensi manual
router.post('/manual', (req, res, next) => absensiController.createManual(req, res, next));
// POST /api/absensi/bulk-manual - Bulk create absensi manual
router.post('/bulk-manual', (req, res, next) => absensiController.bulkCreateManual(req, res, next));
// GET /api/absensi - Get all absensi dengan filter
router.get('/', (req, res, next) => absensiController.findAll(req, res, next));
// GET /api/absensi/:id - Get absensi by ID
router.get('/:id', (req, res, next) => absensiController.findById(req, res, next));
// PUT /api/absensi/:id - Update absensi (manual only)
router.put('/:id', (req, res, next) => absensiController.update(req, res, next));
// DELETE /api/absensi/:id - Delete absensi
router.delete('/:id', (req, res, next) => absensiController.delete(req, res, next));
export default router;
