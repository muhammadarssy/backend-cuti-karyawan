import { Router } from 'express';
import { pengeluaranController } from '../controllers/pengeluaran.controller.js';

const router = Router();

/**
 * Pengeluaran Routes
 * Base path: /api/pengeluaran
 */

// GET /api/pengeluaran/rekap - Get rekap pengeluaran (harus sebelum /:id)
router.get('/rekap', (req, res, next) => pengeluaranController.getRekapPengeluaran(req, res, next));

// POST /api/pengeluaran - Create pengeluaran baru
router.post('/', (req, res, next) => pengeluaranController.create(req, res, next));

// GET /api/pengeluaran/:id - Get pengeluaran by ID
router.get('/:id', (req, res, next) => pengeluaranController.findById(req, res, next));

// GET /api/pengeluaran - Get list pengeluaran
router.get('/', (req, res, next) => pengeluaranController.findAll(req, res, next));

// PUT /api/pengeluaran/:id - Update pengeluaran
router.put('/:id', (req, res, next) => pengeluaranController.update(req, res, next));

// DELETE /api/pengeluaran/:id - Delete pengeluaran
router.delete('/:id', (req, res, next) => pengeluaranController.delete(req, res, next));

export default router;
