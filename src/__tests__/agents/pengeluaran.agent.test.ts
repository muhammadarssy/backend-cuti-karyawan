import { describe, it, expect, beforeEach } from '@jest/globals';
import { pengeluaranAgent } from '../../agents/pengeluaran.agent.js';
import { itemAgent } from '../../agents/item.agent.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

describe('PengeluaranAgent', () => {
  let itemId: string;
  let pengeluaranId: string;
  const uniqueCode = () => `TEST${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

  beforeEach(async () => {
    // Create test item with unique code
    const item = await itemAgent.create({
      kode: uniqueCode(),
      nama: 'Spidol Boardmarker',
      kategori: 'ATK',
      satuan: 'pcs',
      stokMinimal: 10,
      stokSekarang: 50,
    });
    itemId = item.id;

    // Create test pengeluaran
    const pengeluaran = await pengeluaranAgent.create({
      itemId,
      jumlah: 15,
      tanggal: '2026-01-12T00:00:00Z',
      keperluan: 'Kebutuhan kantor',
      penerima: 'Bagian Umum',
      keterangan: 'Distribusi bulanan',
    });
    pengeluaranId = pengeluaran.id;
  });

  describe('create', () => {
    it('should create pengeluaran and decrease stock', async () => {
      const itemBefore = await itemAgent.findById(itemId);
      const stokBefore = itemBefore.stokSekarang;

      const pengeluaranData = {
        itemId,
        jumlah: 10,
        tanggal: '2026-01-13T00:00:00Z',
        keperluan: 'Test keperluan',
        penerima: 'Test penerima',
      };

      const pengeluaran = await pengeluaranAgent.create(pengeluaranData);

      expect(pengeluaran).toBeDefined();
      expect(pengeluaran.jumlah).toBe(10);
      expect(pengeluaran.keperluan).toBe('Test keperluan');

      // Check stock decreased
      const itemAfter = await itemAgent.findById(itemId);
      expect(itemAfter.stokSekarang).toBe(stokBefore - 10);
    });

    it('should allow negative stock for emergency', async () => {
      const pengeluaranData = {
        itemId,
        jumlah: 100, // more than available stock
        tanggal: '2026-01-13T00:00:00Z',
        keperluan: 'Emergency',
      };

      const pengeluaran = await pengeluaranAgent.create(pengeluaranData);

      expect(pengeluaran).toBeDefined();

      // Check stock can be negative
      const item = await itemAgent.findById(itemId);
      expect(item.stokSekarang).toBeLessThan(0);
    });

    it('should throw NotFoundError if item not exists', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const pengeluaranData = {
        itemId: fakeId,
        jumlah: 10,
        tanggal: '2026-01-13T00:00:00Z',
        keperluan: 'Test',
      };

      await expect(pengeluaranAgent.create(pengeluaranData)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if jumlah <= 0', async () => {
      const pengeluaranData = {
        itemId,
        jumlah: 0,
        tanggal: '2026-01-13T00:00:00Z',
        keperluan: 'Test',
      };

      await expect(pengeluaranAgent.create(pengeluaranData)).rejects.toThrow(ValidationError);
    });
  });

  describe('findById', () => {
    it('should get pengeluaran by ID with item relation', async () => {
      const pengeluaran = await pengeluaranAgent.findById(pengeluaranId);

      expect(pengeluaran).toBeDefined();
      expect(pengeluaran.id).toBe(pengeluaranId);
      expect(pengeluaran.item).toBeDefined();
      expect(pengeluaran.item.kode).toBeDefined();
    });

    it('should throw NotFoundError if pengeluaran not exists', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(pengeluaranAgent.findById(fakeId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('findAll', () => {
    it('should get all pengeluaran with pagination', async () => {
      const result = await pengeluaranAgent.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        1,
        10
      );

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.pagination).toBeDefined();
    });

    it('should filter pengeluaran by itemId', async () => {
      const result = await pengeluaranAgent.findAll(
        itemId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        1,
        10
      );

      expect(result.data.every((p) => p.itemId === itemId)).toBe(true);
    });

    it('should filter pengeluaran by keperluan', async () => {
      const result = await pengeluaranAgent.findAll(
        undefined,
        undefined,
        'kantor',
        undefined,
        undefined,
        undefined,
        1,
        10
      );

      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should filter pengeluaran by penerima', async () => {
      const result = await pengeluaranAgent.findAll(
        undefined,
        undefined,
        undefined,
        'Umum',
        undefined,
        undefined,
        1,
        10
      );

      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should update pengeluaran and adjust stock', async () => {
      const itemBefore = await itemAgent.findById(itemId);
      const stokBefore = itemBefore.stokSekarang;

      const updateData = {
        jumlah: 20, // from 15 to 20
        keperluan: 'Updated keperluan',
      };

      const updated = await pengeluaranAgent.update(pengeluaranId, updateData);

      expect(updated.jumlah).toBe(20);
      expect(updated.keperluan).toBe('Updated keperluan');

      // Check stock adjusted (-5 more)
      const itemAfter = await itemAgent.findById(itemId);
      expect(itemAfter.stokSekarang).toBe(stokBefore - 5);
    });

    it('should throw NotFoundError if pengeluaran not exists', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(pengeluaranAgent.update(fakeId, { jumlah: 10 })).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('delete', () => {
    it('should delete pengeluaran and rollback stock', async () => {
      const itemBefore = await itemAgent.findById(itemId);
      const stokBefore = itemBefore.stokSekarang;

      const deleted = await pengeluaranAgent.delete(pengeluaranId);

      expect(deleted).toBeDefined();

      // Check stock rolled back (+15)
      const itemAfter = await itemAgent.findById(itemId);
      expect(itemAfter.stokSekarang).toBe(stokBefore + 15);
    });

    it('should throw NotFoundError if pengeluaran not exists', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(pengeluaranAgent.delete(fakeId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getRekapPengeluaran', () => {
    it('should get rekap by item', async () => {
      const rekap = await pengeluaranAgent.getRekapPengeluaran(
        undefined,
        '2026-01-01T00:00:00Z',
        '2026-01-31T23:59:59Z',
        'item'
      );

      expect(rekap).toBeDefined();
      expect(rekap.periode).toBeDefined();
      expect(rekap.rekap).toBeInstanceOf(Array);
    });

    it('should get rekap by keperluan', async () => {
      const rekap = await pengeluaranAgent.getRekapPengeluaran(
        undefined,
        '2026-01-01T00:00:00Z',
        '2026-01-31T23:59:59Z',
        'keperluan'
      );

      expect(rekap).toBeDefined();
      expect(rekap.rekap).toBeInstanceOf(Array);
    });

    it('should get rekap by penerima', async () => {
      const rekap = await pengeluaranAgent.getRekapPengeluaran(
        undefined,
        '2026-01-01T00:00:00Z',
        '2026-01-31T23:59:59Z',
        'penerima'
      );

      expect(rekap).toBeDefined();
      expect(rekap.rekap).toBeInstanceOf(Array);
    });

    it('should filter rekap by kategori', async () => {
      const rekap = await pengeluaranAgent.getRekapPengeluaran(
        'ATK',
        '2026-01-01T00:00:00Z',
        '2026-01-31T23:59:59Z',
        'item'
      );

      expect(rekap).toBeDefined();
    });
  });
});
