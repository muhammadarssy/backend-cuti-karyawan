import { Router } from 'express';
import { cutiController } from '../controllers/cuti.controller.js';
const router = Router();
/**
 * Cuti Routes
 * Base path: /api/cuti
 */
// POST /api/cuti - Create/record cuti baru
router.post('/', (req, res, next) => cutiController.create(req, res, next));
// GET /api/cuti/rekap/alasan - Get rekap alasan cuti
router.get('/rekap/alasan', (req, res, next) => cutiController.getRekapAlasan(req, res, next));
// GET /api/cuti/summary/:karyawanId - Get summary cuti by karyawan
router.get('/summary/:karyawanId', (req, res, next) => cutiController.getSummary(req, res, next));
// GET /api/cuti/:id - Get cuti by ID
router.get('/:id', (req, res, next) => cutiController.findById(req, res, next));
// GET /api/cuti - Get list cuti
router.get('/', (req, res, next) => cutiController.findAll(req, res, next));
// PUT /api/cuti/:id - Update cuti
router.put('/:id', (req, res, next) => cutiController.update(req, res, next));
// DELETE /api/cuti/:id - Delete/rollback cuti
router.delete('/:id', (req, res, next) => cutiController.delete(req, res, next));
export default router;
