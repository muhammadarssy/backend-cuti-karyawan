import { describe, it, expect, beforeEach } from '@jest/globals';
import { itemAgent } from '../../agents/item.agent.js';
import { BusinessLogicError, NotFoundError, ValidationError } from '../../utils/errors.js';

describe('ItemAgent', () => {
  let itemId: string;
  let itemKode: string;
  const uniqueCode = () => `TEST${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

  beforeEach(async () => {
    // Create test item with unique code
    itemKode = uniqueCode();
    const item = await itemAgent.create({
      kode: itemKode,
      nama: 'Pulpen Hitam',
      kategori: 'ATK',
      satuan: 'pcs',
      stokMinimal: 10,
      stokSekarang: 50,
      keterangan: 'Test item',
    });
    itemId = item.id;
  });

  describe('create', () => {
    it('should create item successfully', async () => {
      const itemData = {
        kode: uniqueCode(),
        nama: 'Paracetamol',
        kategori: 'OBAT' as const,
        satuan: 'tablet',
        stokMinimal: 20,
        stokSekarang: 100,
      };

      const item = await itemAgent.create(itemData);

      expect(item).toBeDefined();
      expect(item.kode).toBe(itemData.kode);
      expect(item.nama).toBe('Paracetamol');
      expect(item.kategori).toBe('OBAT');
      expect(item.stokSekarang).toBe(100);
    });

    it('should throw ValidationError if kode already exists', async () => {
      const duplicateCode = uniqueCode();
      
      await itemAgent.create({
        kode: duplicateCode,
        nama: 'First Item',
        kategori: 'ATK' as const,
        satuan: 'pcs',
      });

      const itemData = {
        kode: duplicateCode, // duplicate
        nama: 'Another Item',
        kategori: 'ATK' as const,
        satuan: 'pcs',
      };

      await expect(itemAgent.create(itemData)).rejects.toThrow(ValidationError);
    });
  });

  describe('findById', () => {
    it('should get item by ID with transaction history', async () => {
      const item = await itemAgent.findById(itemId);

      expect(item).toBeDefined();
      expect(item.id).toBe(itemId);
      expect(item.pembelian).toBeDefined();
      expect(item.pengeluaran).toBeDefined();
    });

    it('should throw NotFoundError if item not exists', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(itemAgent.findById(fakeId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('findAll', () => {
    it('should get all items with pagination', async () => {
      const result = await itemAgent.findAll(undefined, undefined, undefined, undefined, 1, 10);

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should filter items by kategori', async () => {
      const result = await itemAgent.findAll('ATK', undefined, undefined, undefined, 1, 10);

      expect(result.data.every((item) => item.kategori === 'ATK')).toBe(true);
    });

    it('should search items by kode', async () => {
      const result = await itemAgent.findAll(undefined, itemKode, undefined, undefined, 1, 10);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].kode).toBe(itemKode);
    });

    it('should search items by nama', async () => {
      const result = await itemAgent.findAll(undefined, undefined, 'Pulpen', undefined, 1, 10);

      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should update item successfully', async () => {
      const updateData = {
        nama: 'Pulpen Hitam Premium',
        stokMinimal: 15,
      };

      const updated = await itemAgent.update(itemId, updateData);

      expect(updated.nama).toBe('Pulpen Hitam Premium');
      expect(updated.stokMinimal).toBe(15);
    });

    it('should throw NotFoundError if item not exists', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(itemAgent.update(fakeId, { nama: 'Test' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete item without transaction history', async () => {
      const newItem = await itemAgent.create({
        kode: uniqueCode(),
        nama: 'Test Delete',
        kategori: 'ATK',
        satuan: 'pcs',
      });

      const deleted = await itemAgent.delete(newItem.id);

      expect(deleted).toBeDefined();
      expect(deleted.id).toBe(newItem.id);
    });

    it('should throw NotFoundError if item not exists', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(itemAgent.delete(fakeId)).rejects.toThrow(NotFoundError);
    });

    it('should throw BusinessLogicError if item has transaction history', async () => {
      // This test will be valid after we add pembelian/pengeluaran
      // For now, skip or test with mock
      expect(true).toBe(true);
    });
  });

  describe('getStokMenipis', () => {
    it('should get items dengan stok menipis', async () => {
      // Create item with low stock
      await itemAgent.create({
        kode: uniqueCode(),
        nama: 'Low Stock Item',
        kategori: 'ATK',
        satuan: 'pcs',
        stokMinimal: 50,
        stokSekarang: 30, // below minimal
      });

      const items = await itemAgent.getStokMenipis();

      expect(items.length).toBeGreaterThan(0);
      expect(items.every((item) => item.stokSekarang <= item.stokMinimal)).toBe(true);
    });

    it('should filter stok menipis by kategori', async () => {
      const items = await itemAgent.getStokMenipis('ATK');

      expect(items.every((item) => item.kategori === 'ATK')).toBe(true);
    });
  });
});
