import { Router } from 'express';
import { kategoriBudgetController } from '../controllers/kategori-budget.controller.js';

const router = Router();

/**
 * Kategori Budget (Departemen) Routes
 * Base path: /api/kategori-budget
 */

router.post('/', (req, res, next) => kategoriBudgetController.create(req, res, next));
router.get('/active', (req, res, next) => kategoriBudgetController.getActive(req, res, next));
router.get('/', (req, res, next) => kategoriBudgetController.findAll(req, res, next));
router.get('/:id', (req, res, next) => kategoriBudgetController.findById(req, res, next));
router.put('/:id', (req, res, next) => kategoriBudgetController.update(req, res, next));
router.delete('/:id', (req, res, next) => kategoriBudgetController.delete(req, res, next));

export default router;
