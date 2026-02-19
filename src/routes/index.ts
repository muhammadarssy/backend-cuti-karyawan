import { Router } from 'express';
import karyawanRoutes from './karyawan.routes.js';
import cutiTahunanRoutes from './cuti-tahunan.routes.js';
import cutiRoutes from './cuti.routes.js';
import itemRoutes from './item.routes.js';
import pembelianRoutes from './pembelian.routes.js';
import pengeluaranRoutes from './pengeluaran.routes.js';
import absensiRoutes from './absensi.routes.js';
import absensiRekapRoutes from './absensi-rekap.routes.js';
import budgetRoutes from './budget.routes.js';
import kategoriBudgetRoutes from './kategori-budget.routes.js';
import labelStrukRoutes from './label-struk.routes.js';
import strukRoutes from './struk.routes.js';

const router = Router();

/**
 * API Routes
 * Base path: /api
 */

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes - Cuti Management
router.use('/karyawan', karyawanRoutes);
router.use('/cuti-tahunan', cutiTahunanRoutes);
router.use('/cuti', cutiRoutes);

// Mount routes - Absensi Management
router.use('/absensi', absensiRoutes);
router.use('/absensi-rekap', absensiRekapRoutes);

// Mount routes - Inventory Management
router.use('/item', itemRoutes);
router.use('/pembelian', pembelianRoutes);
router.use('/pengeluaran', pengeluaranRoutes);

// Mount routes - Struk Pembelian Management
router.use('/budget', budgetRoutes);
router.use('/kategori-budget', kategoriBudgetRoutes);
router.use('/label-struk', labelStrukRoutes);
router.use('/struk', strukRoutes);

export default router;
