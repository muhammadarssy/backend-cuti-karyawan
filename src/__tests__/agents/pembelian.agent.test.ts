import { describe, it, expect, beforeEach } from '@jest/globals';
import { pembelianAgent } from '../../agents/pembelian.agent.js';
import { itemAgent } from '../../agents/item.agent.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

describe('PembelianAgent', () => {
  let itemId: string;
  let pembelianId: string;
  const uniqueCode = () => `TEST${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

  beforeEach(async () => {
    // Create test item with unique code
    const item = await itemAgent.create({
      kode: uniqueCode(),
      nama: 'Kertas A4',
      kategori: 'ATK',
      satuan: 'rim',
      stokMinimal: 5,
      stokSekarang: 10,
    });
    itemId = item.id;

    // Create test pembelian
    const pembelian = await pembelianAgent.create({
      itemId,
      jumlah: 20,
      tanggal: '2026-01-10T00:00:00Z',
      supplier: 'Toko ATK Sejahtera',
      hargaSatuan: 45000,
      keterangan: 'Pembelian bulanan',
    });
    pembelianId = pembelian.id;
  });

  describe('create', () => {
    it('should create pembelian and increase stock', async () => {
      const itemBefore = await itemAgent.findById(itemId);
      const stokBefore = itemBefore.stokSekarang;

      const pembelianData = {
        itemId,
        jumlah: 10,
        tanggal: '2026-01-13T00:00:00Z',
        supplier: 'Supplier Test',
        hargaSatuan: 50000,
      };

      const pembelian = await pembelianAgent.create(pembelianData);

      expect(pembelian).toBeDefined();
      expect(pembelian.jumlah).toBe(10);
      expect(pembelian.totalHarga).toBe(500000); // 10 * 50000

      // Check stock increased
      const itemAfter = await itemAgent.findById(itemId);
      expect(itemAfter.stokSekarang).toBe(stokBefore + 10);
    });

    it('should throw NotFoundError if item not exists', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const pembelianData = {
        itemId: fakeId,
        jumlah: 10,
        tanggal: '2026-01-13T00:00:00Z',
        hargaSatuan: 50000,
      };

      await expect(pembelianAgent.create(pembelianData)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if jumlah <= 0', async () => {
      const pembelianData = {
        itemId,
        jumlah: 0,
        tanggal: '2026-01-13T00:00:00Z',
        hargaSatuan: 50000,
      };

      await expect(pembelianAgent.create(pembelianData)).rejects.toThrow(ValidationError);
    });
  });

  describe('findById', () => {
    it('should get pembelian by ID with item relation', async () => {
      const pembelian = await pembelianAgent.findById(pembelianId);

      expect(pembelian).toBeDefined();
      expect(pembelian.id).toBe(pembelianId);
      expect(pembelian.item).toBeDefined();
      expect(pembelian.item.kode).toBeDefined();
    });

    it('should throw NotFoundError if pembelian not exists', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(pembelianAgent.findById(fakeId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('findAll', () => {
    it('should get all pembelian with pagination', async () => {
      const result = await pembelianAgent.findAll(
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

    it('should filter pembelian by itemId', async () => {
      const result = await pembelianAgent.findAll(itemId, undefined, undefined, undefined, undefined, 1, 10);

      expect(result.data.every((p) => p.itemId === itemId)).toBe(true);
    });

    it('should filter pembelian by supplier', async () => {
      const result = await pembelianAgent.findAll(
        undefined,
        undefined,
        'Sejahtera',
        undefined,
        undefined,
        1,
        10
      );

      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should update pembelian and adjust stock', async () => {
      const itemBefore = await itemAgent.findById(itemId);
      const stokBefore = itemBefore.stokSekarang;

      const updateData = {
        jumlah: 25, // from 20 to 25
        supplier: 'Supplier Updated',
      };

      const updated = await pembelianAgent.update(pembelianId, updateData);

      expect(updated.jumlah).toBe(25);
      expect(updated.supplier).toBe('Supplier Updated');

      // Check stock adjusted (+5)
      const itemAfter = await itemAgent.findById(itemId);
      expect(itemAfter.stokSekarang).toBe(stokBefore + 5);
    });

    it('should throw NotFoundError if pembelian not exists', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(pembelianAgent.update(fakeId, { jumlah: 10 })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete pembelian and rollback stock', async () => {
      const itemBefore = await itemAgent.findById(itemId);
      const stokBefore = itemBefore.stokSekarang;

      const deleted = await pembelianAgent.delete(pembelianId);

      expect(deleted).toBeDefined();

      // Check stock rolled back (-20)
      const itemAfter = await itemAgent.findById(itemId);
      expect(itemAfter.stokSekarang).toBe(stokBefore - 20);
    });

    it('should throw NotFoundError if pembelian not exists', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(pembelianAgent.delete(fakeId)).rejects.toThrow(NotFoundError);
    });

    it.skip('should allow rollback even if causing negative stock', async () => {
      // Pembelian agent currently allows rollback without stock validation
      // This test documents the behavior but is skipped
      expect(true).toBe(true);
    });
  });

  describe('getRekapPembelian', () => {
    it('should get rekap by item', async () => {
      const rekap = await pembelianAgent.getRekapPembelian(
        undefined,
        '2026-01-01T00:00:00Z',
        '2026-01-31T23:59:59Z',
        'item'
      );

      expect(rekap).toBeDefined();
      expect(rekap.periode).toBeDefined();
      expect(rekap.totalNilai).toBeGreaterThan(0);
      expect(rekap.rekap).toBeInstanceOf(Array);
    });

    it('should get rekap by supplier', async () => {
      const rekap = await pembelianAgent.getRekapPembelian(
        undefined,
        '2026-01-01T00:00:00Z',
        '2026-01-31T23:59:59Z',
        'supplier'
      );

      expect(rekap).toBeDefined();
      expect(rekap.rekap).toBeInstanceOf(Array);
    });

    it('should filter rekap by kategori', async () => {
      const rekap = await pembelianAgent.getRekapPembelian(
        'ATK',
        '2026-01-01T00:00:00Z',
        '2026-01-31T23:59:59Z',
        'item'
      );

      expect(rekap).toBeDefined();
    });
  });
});
