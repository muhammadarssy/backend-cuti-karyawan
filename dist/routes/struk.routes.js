import { Router } from 'express';
import { strukController } from '../controllers/struk.controller.js';
const router = Router();
/**
 * Struk Routes
 * Base path: /api/struk
 */
// POST /api/struk - Create new struk
router.post('/', (req, res, next) => strukController.create(req, res, next));
// GET /api/struk/rekap/label - Get rekap struk by label
router.get('/rekap/label', (req, res, next) => strukController.getRekapByLabel(req, res, next));
// GET /api/struk/rekap/kategori - Get rekap struk by kategori/departemen
router.get('/rekap/kategori', (req, res, next) => strukController.getRekapByKategori(req, res, next));
// GET /api/struk - Get all struk
router.get('/', (req, res, next) => strukController.findAll(req, res, next));
// GET /api/struk/:id - Get struk by ID
router.get('/:id', (req, res, next) => strukController.findById(req, res, next));
// PUT /api/struk/:id - Update struk
router.put('/:id', (req, res, next) => strukController.update(req, res, next));
// DELETE /api/struk/:id - Delete struk
router.delete('/:id', (req, res, next) => strukController.delete(req, res, next));
export default router;
