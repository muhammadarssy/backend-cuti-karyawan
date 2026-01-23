# Migration Guide - Backup & Reset Database

Panduan untuk backup data lama dan reset database untuk apply schema baru (dengan Budget, KategoriBudget, dll).

## ⚠️ PERINGATAN

**Lakukan backup terlebih dahulu sebelum reset database!** Proses reset akan menghapus semua data.

---

## 📋 Langkah-langkah

### 1. Backup Data Lama

Jalankan script backup untuk menyimpan semua data yang ada:

```bash
npm run prisma:backup
```

Script akan:
- Mengambil semua data dari tabel: Karyawan, CutiTahunan, Cuti, Item, Pembelian, Pengeluaran, Absensi
- Menyimpan ke file JSON di folder `backups/`
- Format: `backup-YYYY-MM-DDTHH-mm-ss.json`

**Output:**
```
📦 Memulai backup data...
📋 Mengambil data Karyawan...
📋 Mengambil data Cuti Tahunan...
...
✅ Backup berhasil!
📁 File backup: backups/backup-2026-01-22T10-30-00.json
📊 Statistik:
   - Karyawan: 50
   - Cuti Tahunan: 100
   ...
```

---

### 2. Reset Database

**Hapus semua data** dari database (schema tetap ada):

```bash
npm run prisma:reset -- --confirm
```

**⚠️ PERINGATAN:** Flag `--confirm` wajib untuk mencegah reset tidak sengaja.

Script akan menghapus data dari semua tabel dalam urutan yang benar.

---

### 3. Apply Migration Baru

Jalankan migration untuk apply schema baru (Budget, KategoriBudget, BudgetKategori, dll):

```bash
npm run prisma:migrate
```

Atau jika ingin membuat migration baru:

```bash
npx prisma migrate dev --name add_kategori_budget_rincian
```

---

### 4. Generate Prisma Client

Generate Prisma client dengan schema baru:

```bash
npm run prisma:generate
```

---

### 5. Restore Data (Optional)

Jika ingin restore data dari backup:

```bash
npm run prisma:restore
```

Script akan otomatis menggunakan backup terbaru, atau bisa spesifik:

```bash
npm run prisma:restore backup-2026-01-22T10-30-00.json
```

**Note:** 
- Restore akan menggunakan `upsert` (update jika ada, create jika tidak)
- Data yang di-restore: Karyawan, CutiTahunan, Cuti, Item, Pembelian, Pengeluaran, Absensi
- **Tidak termasuk:** Budget, Struk, StrukItem (karena ini fitur baru)

---

## 📁 Struktur Folder

Setelah backup, akan ada folder `backups/`:

```
backups/
  ├── backup-2026-01-22T10-30-00.json
  ├── backup-2026-01-22T11-00-00.json
  └── ...
```

---

## 🔄 Flow Lengkap

```bash
# 1. Backup data lama
npm run prisma:backup

# 2. Reset database (hapus semua data)
npm run prisma:reset -- --confirm

# 3. Apply migration baru
npm run prisma:migrate

# 4. Generate Prisma client
npm run prisma:generate

# 5. (Optional) Restore data lama
npm run prisma:restore

# 6. Test aplikasi
npm run dev
```

---

## 📝 Catatan Penting

1. **Backup wajib dilakukan** sebelum reset
2. **Data yang di-backup:**
   - ✅ Karyawan
   - ✅ CutiTahunan
   - ✅ Cuti
   - ✅ Item
   - ✅ Pembelian
   - ✅ Pengeluaran
   - ✅ Absensi

3. **Data yang TIDAK di-backup** (karena fitur baru):
   - ❌ Budget
   - ❌ KategoriBudget
   - ❌ BudgetKategori
   - ❌ Struk
   - ❌ StrukItem
   - ❌ LabelStruk

4. **Setelah restore**, data lama akan kembali, tapi:
   - Fitur Budget/Struk masih kosong (harus diisi manual)
   - Relasi tetap terjaga (karyawan → cuti, item → pembelian, dll)

5. **Jika ada error saat restore**, cek:
   - Apakah semua foreign key masih valid?
   - Apakah ada constraint yang berubah di schema baru?

---

## 🆘 Troubleshooting

### Error: Foreign key constraint

Jika ada error foreign key saat restore, kemungkinan:
- Schema berubah dan ada relasi yang berbeda
- Data backup tidak lengkap

**Solusi:** Restore secara bertahap (karyawan dulu, lalu cuti, dll)

### Error: Migration failed

Jika migration gagal:
- Pastikan database sudah di-reset
- Cek apakah ada constraint yang conflict
- Lihat error message untuk detail

### Backup file tidak ditemukan

Pastikan folder `backups/` ada dan berisi file backup.

---

## ✅ Checklist

Sebelum reset:
- [ ] Backup data sudah dilakukan
- [ ] File backup sudah diverifikasi (cek isinya)
- [ ] Database connection sudah benar
- [ ] Sudah siap untuk kehilangan data sementara

Setelah reset:
- [ ] Migration berhasil
- [ ] Prisma client sudah di-generate
- [ ] (Optional) Data sudah di-restore
- [ ] Aplikasi bisa jalan normal

---

## 📞 Support

Jika ada masalah, cek:
1. Log error di console
2. File backup (apakah valid JSON?)
3. Database connection string di `.env`
4. Prisma schema apakah sudah benar
