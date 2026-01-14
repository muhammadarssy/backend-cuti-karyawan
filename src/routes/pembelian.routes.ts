import { Router } from 'express';
import { pembelianController } from '../controllers/pembelian.controller.js';

const router = Router();

/**
 * Pembelian Routes
 * Base path: /api/pembelian
 */

// GET /api/pembelian/rekap - Get rekap pembelian (harus sebelum /:id)
router.get('/rekap', (req, res, next) => pembelianController.getRekapPembelian(req, res, next));

// POST /api/pembelian - Create pembelian baru
router.post('/', (req, res, next) => pembelianController.create(req, res, next));

// GET /api/pembelian/:id - Get pembelian by ID
router.get('/:id', (req, res, next) => pembelianController.findById(req, res, next));

// GET /api/pembelian - Get list pembelian
router.get('/', (req, res, next) => pembelianController.findAll(req, res, next));

// PUT /api/pembelian/:id - Update pembelian
router.put('/:id', (req, res, next) => pembelianController.update(req, res, next));

// DELETE /api/pembelian/:id - Delete pembelian
router.delete('/:id', (req, res, next) => pembelianController.delete(req, res, next));

export default router;
