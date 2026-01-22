import { Router } from 'express';
import { labelStrukController } from '../controllers/label-struk.controller.js';

const router = Router();

/**
 * Label Struk Routes
 * Base path: /api/label-struk
 */

// POST /api/label-struk - Create new label
router.post('/', (req, res, next) => labelStrukController.create(req, res, next));

// GET /api/label-struk/active - Get active labels only
router.get('/active', (req, res, next) => labelStrukController.getActive(req, res, next));

// GET /api/label-struk - Get all labels
router.get('/', (req, res, next) => labelStrukController.findAll(req, res, next));

// GET /api/label-struk/:id - Get label by ID
router.get('/:id', (req, res, next) => labelStrukController.findById(req, res, next));

// PUT /api/label-struk/:id - Update label
router.put('/:id', (req, res, next) => labelStrukController.update(req, res, next));

// DELETE /api/label-struk/:id - Delete label
router.delete('/:id', (req, res, next) => labelStrukController.delete(req, res, next));

export default router;
