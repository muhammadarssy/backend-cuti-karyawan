# Backend Flow & API Endpoint Specification

## Sistem Cuti Karyawan Berbasis Agent & Prisma ORM

Dokumen ini menjelaskan alur kerja (flow) backend dan spesifikasi API pada sistem cuti karyawan. Perancangan dilakukan dengan pendekatan **agent/service-oriented** untuk memastikan pemisahan logika bisnis, kemudahan pengembangan, serta mendukung pengelolaan cuti tahunan lintas tahun.

---

## 1. Gambaran Umum Arsitektur

Arsitektur backend menggunakan pola berikut:

```
Controller (API Layer)
   ↓
Agent / Service (Business Logic)
   ↓
Repository (Prisma ORM)
   ↓
Database
```

Pendekatan ini memastikan bahwa controller hanya bertugas menerima dan mengembalikan respons, sementara seluruh aturan bisnis berada pada layer agent.

---

## 2. Daftar Agent

* **KaryawanAgent** → manajemen data karyawan
* **CutiTahunanAgent** → pengelolaan hak cuti per tahun
* **CutiAgent** → transaksi dan persetujuan cuti
* **SchedulerAgent** (opsional) → proses otomatis awal tahun

---

## 3. Flow Agent Karyawan

### 3.1 Pembuatan Data Karyawan

1. API menerima permintaan tambah karyawan
2. Controller memanggil `KaryawanAgent.create()`
3. Validasi NIK tidak duplikat
4. Data disimpan ke tabel **Karyawan**
5. Sistem belum membuat data cuti tahunan

Tujuan tahap ini adalah memastikan data master karyawan tersimpan terlebih dahulu sebelum hak cuti dikelola.

---

## 4. Flow Agent Cuti Tahunan (Generate Tahunan)

### 4.1 Trigger Proses

* Awal tahun (cron / scheduler)
* Manual oleh admin
* Aktivasi pertama karyawan

### 4.2 Alur Proses

1. `SchedulerAgent.generateCutiTahunan(tahun)`

2. Ambil seluruh karyawan dengan status **AKTIF**

3. Periksa apakah data cuti tahun berjalan sudah ada

4. Ambil data cuti tahun sebelumnya (jika ada)

5. Ambil `sisaCuti` sebagai **carry forward**

6. Tentukan `jatahDasar`:

   * Tahun pertama → **PRORATE / PROBATION**
   * Tahun berikutnya → **FULL (12 hari)**

7. Hitung total hak cuti:

   totalHakCuti = jatahDasar + carryForward

8. Simpan data ke tabel **CutiTahunan**

Proses ini tidak mengubah data historis tahun sebelumnya.

---

## 5. Flow Agent Pengajuan Cuti

### 5.1 Pengajuan Cuti

1. API menerima permintaan pengajuan cuti
2. Controller memanggil `CutiAgent.create()`
3. Sistem menentukan tahun dari `tanggalMulai`
4. Ambil data **CutiTahunan** sesuai tahun
5. Validasi sisa cuti mencukupi
6. Simpan data ke tabel **Cuti**
7. Status awal: **PENGAJUAN**

---

## 6. Flow Agent Pencatatan Cuti (Tanpa Approval)

Pada sistem ini, cuti **tidak melalui proses persetujuan**. Setiap cuti yang dicatat dianggap **langsung sah** dan otomatis mengurangi saldo cuti tahunan.

### 6.1 Pencatatan Cuti

1. API menerima permintaan pencatatan cuti

2. Controller memanggil `CutiAgent.create()`

3. Sistem menentukan tahun dari `tanggalMulai`

4. Ambil data **CutiTahunan** sesuai tahun

5. Validasi:

   * `sisaCuti >= jumlahHari`

6. Sistem langsung melakukan update saldo:

   cutiTerpakai += jumlahHari
   sisaCuti -= jumlahHari

7. Data cuti disimpan ke tabel **Cuti**

8. Status otomatis diset sebagai **DISETUJUI** (default sistem)

---

## 7. Flow Penghapusan dan Rollback Cuti

Jika data cuti dihapus, maka sistem **selalu melakukan rollback saldo cuti**, karena setiap cuti yang dicatat langsung memengaruhi saldo.

Langkah rollback:

* `cutiTerpakai` dikurangi sejumlah `jumlahHari`
* `sisaCuti` ditambahkan kembali

Langkah ini menjaga konsistensi data saldo cuti tahunan.

---

## 8. Flow Rekap dan Laporan

### 8.1 Rekap Cuti Tahunan

* Mengambil data dari tabel **CutiTahunan**
* Filter berdasarkan tahun dan karyawan

### 8.2 Rekap Alasan Cuti

* Mengambil data dari tabel **Cuti**
* Filter status **DISETUJUI**
* Group berdasarkan alasan cuti

---

## 9. API Endpoint Specification

### 9.1 Karyawan

| Method | Endpoint          | Deskripsi            |
| ------ | ----------------- | -------------------- |
| POST   | /api/karyawan     | Tambah karyawan      |
| GET    | /api/karyawan     | List karyawan        |
| GET    | /api/karyawan/:id | Detail karyawan      |
| PUT    | /api/karyawan/:id | Update karyawan      |
| DELETE | /api/karyawan/:id | Nonaktifkan karyawan |

---

### 9.2 Cuti Tahunan

| Method | Endpoint                   | Deskripsi                 |
| ------ | -------------------------- | ------------------------- |
| POST   | /api/cuti-tahunan/generate | Generate hak cuti tahunan |
| GET    | /api/cuti-tahunan          | Rekap cuti tahunan        |
| GET    | /api/cuti-tahunan/:id      | Detail cuti tahunan       |

---

### 9.3 Transaksi Cuti

| Method | Endpoint      | Deskripsi                                 |
| ------ | ------------- | ----------------------------------------- |
| POST   | /api/cuti     | Pencatatan cuti (langsung memotong saldo) |
| DELETE | /api/cuti/:id | Hapus / rollback pencatatan cuti          |
| GET    | /api/cuti     | List data cuti                            |

---

---|---------|----------|
| POST | /api/cuti | Pengajuan cuti |
| PUT | /api/cuti/:id/approve | Persetujuan cuti |
| PUT | /api/cuti/:id/reject | Penolakan cuti |
| DELETE | /api/cuti/:id | Hapus / rollback cuti |
| GET | /api/cuti | List cuti |

---

## 10. Aturan Konsistensi Data

* Setiap karyawan hanya memiliki satu data cuti per tahun
* Setiap pencatatan cuti langsung mengurangi saldo cuti
* Carry forward berasal dari sisa cuti tahun sebelumnya
* Data historis tidak pernah dimodifikasi
* Semua transaksi cuti terikat pada cuti tahunan

---

## 11. Catatan Akademik

Pendekatan pencatatan langsung digunakan untuk menyederhanakan proses administrasi cuti, di mana setiap cuti yang dicatat dianggap sah dan secara otomatis memengaruhi saldo cuti tahunan. Pendekatan ini sesuai untuk organisasi dengan kebijakan cuti tanpa proses persetujuan berjenjang dan tetap menjaga konsistensi data lintas tahun.
