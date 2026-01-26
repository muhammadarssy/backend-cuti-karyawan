import { Router } from 'express';
import { budgetController } from '../controllers/budget.controller.js';
const router = Router();
/**
 * Budget Routes
 * Base path: /api/budget
 */
// POST /api/budget - Create new budget
router.post('/', (req, res, next) => budgetController.create(req, res, next));
// GET /api/budget - Get all budget
router.get('/', (req, res, next) => budgetController.findAll(req, res, next));
// GET /api/budget/bulan/:bulan/tahun/:tahun - Get budget by bulan and tahun
router.get('/bulan/:bulan/tahun/:tahun', (req, res, next) => budgetController.findByBulanTahun(req, res, next));
// GET /api/budget/:id/summary - Get budget summary
router.get('/:id/summary', (req, res, next) => budgetController.getSummary(req, res, next));
// GET /api/budget/:id - Get budget by ID
router.get('/:id', (req, res, next) => budgetController.findById(req, res, next));
// PUT /api/budget/:id - Update budget
router.put('/:id', (req, res, next) => budgetController.update(req, res, next));
// DELETE /api/budget/:id - Delete budget
router.delete('/:id', (req, res, next) => budgetController.delete(req, res, next));
export default router;
