import { describe, it, expect, beforeEach } from '@jest/globals';
import { cutiTahunanAgent } from '../../agents/cuti-tahunan.agent.js';
import { karyawanAgent } from '../../agents/karyawan.agent.js';
import { BusinessLogicError, NotFoundError } from '../../utils/errors.js';

describe('CutiTahunanAgent', () => {
  let karyawanId: string;

  beforeEach(async () => {
    const karyawan = await karyawanAgent.create({
      nik: '123456',
      nama: 'Test User',
      jabatan: 'Engineer',
      departemen: 'IT',
      tanggalMasuk: new Date('2024-01-15'),
    });
    karyawanId = karyawan.id;
  });

  describe('generateCutiTahunan', () => {
    it('should generate cuti tahunan for new year', async () => {
      const cutiTahunan = await cutiTahunanAgent.generateCutiTahunan(karyawanId, 2026);

      expect(cutiTahunan).toBeDefined();
      expect(cutiTahunan.karyawanId).toBe(karyawanId);
      expect(cutiTahunan.tahun).toBe(2026);
      expect(cutiTahunan.totalHakCuti).toBeGreaterThan(0);
      expect(cutiTahunan.sisaCuti).toBe(cutiTahunan.totalHakCuti);
    });

    it('should throw error if cuti tahunan already exists', async () => {
      await cutiTahunanAgent.generateCutiTahunan(karyawanId, 2026);

      await expect(cutiTahunanAgent.generateCutiTahunan(karyawanId, 2026)).rejects.toThrow(
        BusinessLogicError
      );
    });

    it('should carry forward sisa cuti from previous year', async () => {
      // Generate tahun 2025 dengan sisa cuti
      const cutiTahunan2025 = await cutiTahunanAgent.generateCutiTahunan(karyawanId, 2025);

      // Update sisa cuti
      await cutiTahunanAgent.updateSaldo(cutiTahunan2025.id, 5, 'subtract');

      // Generate tahun 2026
      const cutiTahunan2026 = await cutiTahunanAgent.generateCutiTahunan(karyawanId, 2026);

      expect(cutiTahunan2026.carryForward).toBeGreaterThan(0);
      expect(cutiTahunan2026.totalHakCuti).toBe(
        cutiTahunan2026.jatahDasar + cutiTahunan2026.carryForward
      );
    });

    it('should handle PROBATION for karyawan joining Q3/Q4', async () => {
      const newKaryawan = await karyawanAgent.create({
        nik: '999999',
        nama: 'Late Joiner',
        tanggalMasuk: new Date('2026-08-01'), // Q3
        jabatan: 'Engineer',
        departemen: 'IT',
      });

      const cutiTahunan = await cutiTahunanAgent.generateCutiTahunan(newKaryawan.id, 2026);

      expect(cutiTahunan.tipe).toBe('PROBATION');
      expect(cutiTahunan.jatahDasar).toBe(0);
    });

    it('should handle PRORATE for karyawan joining Q1/Q2', async () => {
      const newKaryawan = await karyawanAgent.create({
        nik: '888888',
        nama: 'Early Joiner',
        tanggalMasuk: new Date('2026-03-01'), // Q1
        jabatan: 'Engineer',
        departemen: 'IT',
      });

      const cutiTahunan = await cutiTahunanAgent.generateCutiTahunan(newKaryawan.id, 2026);

      expect(cutiTahunan.tipe).toBe('PRORATE');
      expect(cutiTahunan.jatahDasar).toBeGreaterThan(0);
      expect(cutiTahunan.jatahDasar).toBeLessThan(12);
    });
  });

  describe('generateCutiTahunanBulk', () => {
    it('should generate cuti tahunan for all active karyawan', async () => {
      await karyawanAgent.create({
        nik: '654321',
        nama: 'Second User',
        tanggalMasuk: new Date('2024-01-15'),
      });

      const result = await cutiTahunanAgent.generateCutiTahunanBulk(2026);

      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return cuti tahunan by ID', async () => {
      const created = await cutiTahunanAgent.generateCutiTahunan(karyawanId, 2026);
      const found = await cutiTahunanAgent.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });

    it('should throw NotFoundError if not found', async () => {
      await expect(cutiTahunanAgent.findById('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByKaryawanAndTahun', () => {
    it('should return cuti tahunan by karyawan and tahun', async () => {
      await cutiTahunanAgent.generateCutiTahunan(karyawanId, 2026);
      const found = await cutiTahunanAgent.findByKaryawanAndTahun(karyawanId, 2026);

      expect(found).toBeDefined();
      expect(found.karyawanId).toBe(karyawanId);
      expect(found.tahun).toBe(2026);
    });

    it('should throw NotFoundError if not found', async () => {
      await expect(
        cutiTahunanAgent.findByKaryawanAndTahun(karyawanId, 2099)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateSaldo', () => {
    it('should subtract cuti correctly', async () => {
      const cutiTahunan = await cutiTahunanAgent.generateCutiTahunan(karyawanId, 2026);
      const initialSisa = cutiTahunan.sisaCuti;

      const updated = await cutiTahunanAgent.updateSaldo(cutiTahunan.id, 3, 'subtract');

      expect(updated.cutiTerpakai).toBe(3);
      expect(updated.sisaCuti).toBe(initialSisa - 3);
    });

    it('should add cuti correctly (rollback)', async () => {
      const cutiTahunan = await cutiTahunanAgent.generateCutiTahunan(karyawanId, 2026);
      await cutiTahunanAgent.updateSaldo(cutiTahunan.id, 5, 'subtract');

      const updated = await cutiTahunanAgent.updateSaldo(cutiTahunan.id, 2, 'add');

      expect(updated.cutiTerpakai).toBe(3);
    });

    it('should throw error if insufficient saldo', async () => {
      const cutiTahunan = await cutiTahunanAgent.generateCutiTahunan(karyawanId, 2026);

      await expect(
        cutiTahunanAgent.updateSaldo(cutiTahunan.id, 999, 'subtract')
      ).rejects.toThrow(BusinessLogicError);
    });
  });

  describe('getRekapCutiTahunan', () => {
    it('should return rekap with filters', async () => {
      await cutiTahunanAgent.generateCutiTahunan(karyawanId, 2026);

      const rekap = await cutiTahunanAgent.getRekapCutiTahunan(2026, karyawanId);

      expect(rekap).toHaveLength(1);
      expect(rekap[0].tahun).toBe(2026);
    });

    it('should return all rekap without filters', async () => {
      await cutiTahunanAgent.generateCutiTahunan(karyawanId, 2026);

      const rekap = await cutiTahunanAgent.getRekapCutiTahunan();

      expect(rekap.length).toBeGreaterThan(0);
    });
  });
});
