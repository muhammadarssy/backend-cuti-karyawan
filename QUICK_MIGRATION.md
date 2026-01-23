# Quick Migration Guide

## 🚀 Langkah Cepat

```bash
# 1. Backup data
npm run prisma:backup

# 2. Reset database (hapus semua data)
npm run prisma:reset -- --confirm

# 3. Apply migration baru
npm run prisma:migrate

# 4. Generate Prisma client
npm run prisma:generate

# 5. (Optional) Restore data
npm run prisma:restore
```

---

## 📋 Detail

### 1. Backup (`npm run prisma:backup`)
- Backup semua data ke `backups/backup-{timestamp}.json`
- Data: Karyawan, Cuti, Item, Inventory, Absensi
- **File backup aman**, bisa di-restore nanti

### 2. Reset (`npm run prisma:reset -- --confirm`)
- **Hapus semua data** dari database
- Schema tetap ada, hanya data yang dihapus
- **Wajib flag `--confirm`** untuk safety

### 3. Migrate (`npm run prisma:migrate`)
- Apply schema baru (Budget, KategoriBudget, Struk, dll)
- Buat migration file otomatis
- Update database structure

### 4. Generate (`npm run prisma:generate`)
- Generate Prisma client dengan schema baru
- Wajib setelah migration

### 5. Restore (`npm run prisma:restore`)
- Restore data dari backup terbaru
- Atau spesifik: `npm run prisma:restore backup-2026-01-22T10-30-00.json`

---

## ⚠️ Catatan

- **Backup WAJIB** sebelum reset
- Data yang di-backup: Karyawan, Cuti, Item, Inventory, Absensi
- Data yang **TIDAK** di-backup: Budget, Struk (fitur baru)
- Setelah restore, data lama kembali, tapi fitur Budget/Struk masih kosong

---

Lihat `MIGRATION_GUIDE.md` untuk detail lengkap.
