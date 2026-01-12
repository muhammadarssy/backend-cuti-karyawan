import { Router } from 'express';
import { cutiTahunanController } from '../controllers/cuti-tahunan.controller.js';
const router = Router();
/**
 * Cuti Tahunan Routes
 * Base path: /api/cuti-tahunan
 */
// POST /api/cuti-tahunan/generate - Generate hak cuti tahunan
router.post('/generate', (req, res, next) => cutiTahunanController.generate(req, res, next));
// GET /api/cuti-tahunan - Get rekap cuti tahunan
router.get('/', (req, res, next) => cutiTahunanController.getRekap(req, res, next));
// GET /api/cuti-tahunan/:id - Get detail cuti tahunan by ID
router.get('/:id', (req, res, next) => cutiTahunanController.findById(req, res, next));
export default router;
