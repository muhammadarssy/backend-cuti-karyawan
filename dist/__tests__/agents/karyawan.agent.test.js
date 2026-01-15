import { describe, it, expect, beforeEach } from '@jest/globals';
import { karyawanAgent } from '../../agents/karyawan.agent.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
describe('KaryawanAgent', () => {
    const mockKaryawan = {
        nik: '123456',
        nama: 'John Doe',
        jabatan: 'Software Engineer',
        departemen: 'IT',
        tanggalMasuk: new Date('2024-01-15'),
    };
    describe('create', () => {
        it('should create a new karyawan successfully', async () => {
            const karyawan = await karyawanAgent.create(mockKaryawan);
            expect(karyawan).toBeDefined();
            expect(karyawan.nik).toBe(mockKaryawan.nik);
            expect(karyawan.nama).toBe(mockKaryawan.nama);
            expect(karyawan.status).toBe('AKTIF');
        });
        it('should throw ConflictError if NIK already exists', async () => {
            await karyawanAgent.create(mockKaryawan);
            await expect(karyawanAgent.create(mockKaryawan)).rejects.toThrow(ConflictError);
        });
    });
    describe('findAll', () => {
        beforeEach(async () => {
            await karyawanAgent.create(mockKaryawan);
            await karyawanAgent.create({
                ...mockKaryawan,
                nik: '654321',
                nama: 'Jane Doe',
            });
        });
        it('should return all karyawan', async () => {
            const result = await karyawanAgent.findAll();
            expect(result.data).toHaveLength(2);
        });
        it('should filter by status AKTIF', async () => {
            const result = await karyawanAgent.findAll('AKTIF');
            expect(result.data).toHaveLength(2);
            expect(result.data.every((k) => k.status === 'AKTIF')).toBe(true);
        });
    });
    describe('findById', () => {
        it('should return karyawan by ID', async () => {
            const created = await karyawanAgent.create(mockKaryawan);
            const found = await karyawanAgent.findById(created.id);
            expect(found).toBeDefined();
            expect(found.id).toBe(created.id);
            expect(found.nik).toBe(mockKaryawan.nik);
        });
        it('should throw NotFoundError if karyawan not found', async () => {
            await expect(karyawanAgent.findById('non-existent-id')).rejects.toThrow(NotFoundError);
        });
    });
    describe('findByNik', () => {
        it('should return karyawan by NIK', async () => {
            await karyawanAgent.create(mockKaryawan);
            const found = await karyawanAgent.findByNik(mockKaryawan.nik);
            expect(found).toBeDefined();
            expect(found.nik).toBe(mockKaryawan.nik);
        });
        it('should throw NotFoundError if NIK not found', async () => {
            await expect(karyawanAgent.findByNik('non-existent-nik')).rejects.toThrow(NotFoundError);
        });
    });
    describe('update', () => {
        it('should update karyawan successfully', async () => {
            const created = await karyawanAgent.create(mockKaryawan);
            const updated = await karyawanAgent.update(created.id, {
                nama: 'John Updated',
                jabatan: 'Senior Engineer',
            });
            expect(updated.nama).toBe('John Updated');
            expect(updated.jabatan).toBe('Senior Engineer');
        });
        it('should throw NotFoundError if karyawan not found', async () => {
            await expect(karyawanAgent.update('non-existent-id', { nama: 'Test' })).rejects.toThrow(NotFoundError);
        });
    });
    describe('deactivate', () => {
        it('should set karyawan status to NONAKTIF', async () => {
            const created = await karyawanAgent.create(mockKaryawan);
            const deactivated = await karyawanAgent.deactivate(created.id);
            expect(deactivated.status).toBe('NONAKTIF');
        });
    });
    describe('getActiveKaryawan', () => {
        it('should return only active karyawan', async () => {
            const created1 = await karyawanAgent.create(mockKaryawan);
            await karyawanAgent.create({ ...mockKaryawan, nik: '654321' });
            await karyawanAgent.deactivate(created1.id);
            const activeKaryawan = await karyawanAgent.getActiveKaryawan();
            expect(activeKaryawan).toHaveLength(1);
            expect(activeKaryawan[0].status).toBe('AKTIF');
        });
    });
});
