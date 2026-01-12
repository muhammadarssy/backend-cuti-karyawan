import { Router } from 'express';
import karyawanRoutes from './karyawan.routes.js';
import cutiTahunanRoutes from './cuti-tahunan.routes.js';
import cutiRoutes from './cuti.routes.js';

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

// Mount routes
router.use('/karyawan', karyawanRoutes);
router.use('/cuti-tahunan', cutiTahunanRoutes);
router.use('/cuti', cutiRoutes);

export default router;
