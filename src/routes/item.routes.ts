import { Router } from 'express';
import { itemController } from '../controllers/item.controller.js';

const router = Router();

/**
 * Item Routes
 * Base path: /api/item
 */

// GET /api/item/stok-menipis - Get items dengan stok menipis (harus sebelum /:id)
router.get('/stok-menipis', (req, res, next) => itemController.getStokMenipis(req, res, next));

// POST /api/item - Create item baru
router.post('/', (req, res, next) => itemController.create(req, res, next));

// GET /api/item/:id - Get item by ID
router.get('/:id', (req, res, next) => itemController.findById(req, res, next));

// GET /api/item - Get list items
router.get('/', (req, res, next) => itemController.findAll(req, res, next));

// PUT /api/item/:id - Update item
router.put('/:id', (req, res, next) => itemController.update(req, res, next));

// DELETE /api/item/:id - Delete item
router.delete('/:id', (req, res, next) => itemController.delete(req, res, next));

export default router;
