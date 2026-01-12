import { Router } from 'express';
import { karyawanController } from '../controllers/karyawan.controller.js';

const router = Router();

/**
 * Karyawan Routes
 * Base path: /api/karyawan
 */

// POST /api/karyawan - Create new karyawan
router.post('/', (req, res, next) => karyawanController.create(req, res, next));

// GET /api/karyawan - Get all karyawan
router.get('/', (req, res, next) => karyawanController.findAll(req, res, next));

// GET /api/karyawan/:id - Get karyawan by ID
router.get('/:id', (req, res, next) => karyawanController.findById(req, res, next));

// PUT /api/karyawan/:id - Update karyawan
router.put('/:id', (req, res, next) => karyawanController.update(req, res, next));

// DELETE /api/karyawan/:id - Deactivate karyawan
router.delete('/:id', (req, res, next) => karyawanController.deactivate(req, res, next));

export default router;
