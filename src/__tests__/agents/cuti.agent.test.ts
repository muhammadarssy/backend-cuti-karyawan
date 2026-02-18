import { describe, it, expect, beforeEach } from '@jest/globals';
import { cutiAgent } from '../../agents/cuti.agent.js';
import { cutiTahunanAgent } from '../../agents/cuti-tahunan.agent.js';
import { karyawanAgent } from '../../agents/karyawan.agent.js';
import { BusinessLogicError, NotFoundError, ValidationError } from '../../utils/errors.js';

describe('CutiAgent', () => {
  let karyawanId: string;
  let cutiTahunanId: string;

  beforeEach(async () => {
    const karyawan = await karyawanAgent.create({
      nik: '123456',
      nama: 'Test User',
      jabatan: 'Engineer',
      departemen: 'STAFF',
      tanggalMasuk: new Date('2024-01-15'),
    });
    karyawanId = karyawan.id;

    const cutiTahunan = await cutiTahunanAgent.generateCutiTahunan(karyawanId, 2026);
    cutiTahunanId = cutiTahunan.id;
  });

  describe('create', () => {
    it('should create cuti tahunan successfully', async () => {
      const cutiData = {
        karyawanId,
        jenis: 'TAHUNAN' as const,
        alasan: 'Liburan keluarga',
        tanggalMulai: '2026-02-01T00:00:00Z',
        tanggalSelesai: '2026-02-05T00:00:00Z',
      };

      const cuti = await cutiAgent.create(cutiData);

      expect(cuti).toBeDefined();
      expect(cuti.karyawanId).toBe(karyawanId);
      expect(cuti.jenis).toBe('TAHUNAN');
      expect(cuti.jumlahHari).toBeGreaterThan(0);
    });

    it('should auto-generate cuti tahunan if not exists', async () => {
      const newKaryawan = await karyawanAgent.create({
        nik: '999999',
        nama: 'New User',
        tanggalMasuk: new Date('2025-01-15'),
      });

      const cutiData = {
        karyawanId: newKaryawan.id,
        jenis: 'TAHUNAN' as const,
        alasan: 'Test',
        tanggalMulai: '2026-03-01T00:00:00Z',
        tanggalSelesai: '2026-03-03T00:00:00Z',
      };

      const cuti = await cutiAgent.create(cutiData);

      expect(cuti).toBeDefined();
    });

    it('should create cuti sakit without checking saldo', async () => {
      const cutiData = {
        karyawanId,
        jenis: 'SAKIT' as const,
        alasan: 'Demam',
        tanggalMulai: '2026-02-01T00:00:00Z',
        tanggalSelesai: '2026-02-05T00:00:00Z',
      };

      const cuti = await cutiAgent.create(cutiData);

      expect(cuti).toBeDefined();
      expect(cuti.jenis).toBe('SAKIT');
    });

    it('should throw ValidationError if tanggalSelesai < tanggalMulai', async () => {
      const cutiData = {
        karyawanId,
        jenis: 'TAHUNAN' as const,
        alasan: 'Test',
        tanggalMulai: '2026-02-05T00:00:00Z',
        tanggalSelesai: '2026-02-01T00:00:00Z', // Invalid
      };

      await expect(cutiAgent.create(cutiData)).rejects.toThrow(ValidationError);
    });

    it('should throw BusinessLogicError if insufficient saldo', async () => {
      // Use up all cuti
      const cutiTahunan = await cutiTahunanAgent.findById(cutiTahunanId);
      await cutiTahunanAgent.updateSaldo(cutiTahunanId, cutiTahunan.sisaCuti, 'subtract');

      const cutiData = {
        karyawanId,
        jenis: 'TAHUNAN' as const,
        alasan: 'Test',
        tanggalMulai: '2026-02-01T00:00:00Z',
        tanggalSelesai: '2026-02-05T00:00:00Z',
      };

      await expect(cutiAgent.create(cutiData)).rejects.toThrow(BusinessLogicError);
    });

    it('should deduct saldo for cuti tahunan', async () => {
      const cutiTahunanBefore = await cutiTahunanAgent.findById(cutiTahunanId);

      const cutiData = {
        karyawanId,
        jenis: 'TAHUNAN' as const,
        alasan: 'Test',
        tanggalMulai: '2026-02-01T00:00:00Z',
        tanggalSelesai: '2026-02-03T00:00:00Z',
      };

      const cuti = await cutiAgent.create(cutiData);

      const cutiTahunanAfter = await cutiTahunanAgent.findById(cutiTahunanId);

      expect(cutiTahunanAfter.sisaCuti).toBeLessThan(cutiTahunanBefore.sisaCuti);
      expect(cutiTahunanAfter.cutiTerpakai).toBe(cuti.jumlahHari);
    });
  });

  describe('delete', () => {
    it('should delete cuti and rollback saldo', async () => {
      const cutiData = {
        karyawanId,
        jenis: 'TAHUNAN' as const,
        alasan: 'Test',
        tanggalMulai: '2026-02-01T00:00:00Z',
        tanggalSelesai: '2026-02-03T00:00:00Z',
      };

      const cuti = await cutiAgent.create(cutiData);
      const cutiTahunanBefore = await cutiTahunanAgent.findById(cutiTahunanId);

      await cutiAgent.delete(cuti.id);

      const cutiTahunanAfter = await cutiTahunanAgent.findById(cutiTahunanId);

      expect(cutiTahunanAfter.sisaCuti).toBeGreaterThan(cutiTahunanBefore.sisaCuti);
      expect(cutiTahunanAfter.cutiTerpakai).toBe(0);
    });

    it('should throw NotFoundError if cuti not found', async () => {
      await expect(cutiAgent.delete('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findById', () => {
    it('should return cuti by ID', async () => {
      const cutiData = {
        karyawanId,
        jenis: 'TAHUNAN' as const,
        alasan: 'Test',
        tanggalMulai: '2026-02-01T00:00:00Z',
        tanggalSelesai: '2026-02-03T00:00:00Z',
      };

      const created = await cutiAgent.create(cutiData);
      const found = await cutiAgent.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });

    it('should throw NotFoundError if not found', async () => {
      await expect(cutiAgent.findById('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await cutiAgent.create({
        karyawanId,
        jenis: 'TAHUNAN',
        alasan: 'Test 1',
        tanggalMulai: '2026-02-01T00:00:00Z',
        tanggalSelesai: '2026-02-03T00:00:00Z',
      });

      await cutiAgent.create({
        karyawanId,
        jenis: 'SAKIT',
        alasan: 'Test 2',
        tanggalMulai: '2026-03-01T00:00:00Z',
        tanggalSelesai: '2026-03-02T00:00:00Z',
      });
    });

    it('should return all cuti with pagination', async () => {
      const result = await cutiAgent.findAll();

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by jenis', async () => {
      const result = await cutiAgent.findAll(undefined, 'SAKIT');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].jenis).toBe('SAKIT');
    });

    it('should filter by karyawanId', async () => {
      const result = await cutiAgent.findAll(karyawanId);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((c) => c.karyawanId === karyawanId)).toBe(true);
    });

    it('should filter by tahun', async () => {
      const result = await cutiAgent.findAll(undefined, undefined, 2026);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((c) => c.tahun === 2026)).toBe(true);
    });
  });

  describe('getRekapAlasanCuti', () => {
    it('should return rekap grouped by jenis and alasan', async () => {
      await cutiAgent.create({
        karyawanId,
        jenis: 'TAHUNAN',
        alasan: 'Liburan',
        tanggalMulai: '2026-02-01T00:00:00Z',
        tanggalSelesai: '2026-02-03T00:00:00Z',
      });

      const rekap = await cutiAgent.getRekapAlasanCuti(2026);

      expect(rekap.length).toBeGreaterThan(0);
      expect(rekap[0]._count.id).toBeGreaterThan(0);
      expect(rekap[0]._sum.jumlahHari).toBeGreaterThan(0);
    });
  });

  describe('getSummaryByKaryawan', () => {
    it('should return summary grouped by jenis', async () => {
      await cutiAgent.create({
        karyawanId,
        jenis: 'TAHUNAN',
        alasan: 'Test',
        tanggalMulai: '2026-02-01T00:00:00Z',
        tanggalSelesai: '2026-02-03T00:00:00Z',
      });

      const summary = await cutiAgent.getSummaryByKaryawan(karyawanId, 2026);

      expect(summary.length).toBeGreaterThan(0);
      expect(summary[0]._count.id).toBeGreaterThan(0);
    });
  });
});
