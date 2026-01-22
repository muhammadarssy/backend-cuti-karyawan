# API Specification - Struk Pembelian

## Base URL
```
http://localhost:3000/api
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Pesan sukses",
  "data": {} | [],
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Pesan sukses",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Pesan error",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

---

## 1. Kategori Budget (Departemen) Endpoints

Kategori budget = departemen (Pantry, HRD, dll). Bisa ditambah/diubah. Budget per bulan dirinci per kategori.

### POST /kategori-budget
Buat kategori budget baru.

**Request Body:**
```json
{
  "nama": "Pantry",
  "deskripsi": "Departemen pantry"  // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Kategori budget berhasil ditambahkan",
  "data": {
    "id": "uuid",
    "nama": "Pantry",
    "deskripsi": "Departemen pantry",
    "isAktif": true,
    "createdAt": "...",
    "updatedAt": "..."
  },
  "meta": { "timestamp": "..." }
}
```

### GET /kategori-budget
Semua kategori (pagination). Query: `isAktif`, `page`, `limit`.

### GET /kategori-budget/active
Hanya kategori aktif (tanpa pagination). Dipakai untuk dropdown saat buat budget / struk.

### GET /kategori-budget/:id
Detail kategori by ID.

### PUT /kategori-budget/:id
Update. Body: `nama`, `deskripsi`, `isAktif` (optional).

### DELETE /kategori-budget/:id
Hapus. Jika sudah dipakai di struk → soft delete (isAktif=false).

---

## 2. Budget Endpoints

Budget per bulan-tahun. **Total = jumlah rincian per kategori** (contoh: Januari 4jt = Pantry 2,5jt + HRD 1,5jt).

### POST /budget
Buat budget dengan rincian per kategori.

**Request Body:**
```json
{
  "bulan": 1,
  "tahun": 2026,
  "rincian": [
    { "kategoriBudgetId": "uuid-pantry", "alokasi": 2500000 },
    { "kategoriBudgetId": "uuid-hrd", "alokasi": 1500000 }
  ]
}
```

- `rincian`: minimal 1. Tiap kategori boleh sekali saja. `alokasi` > 0.
- `totalBudget` dihitung otomatis = sum(alokasi).

**Response (201):**
```json
{
  "success": true,
  "message": "Budget berhasil ditambahkan",
  "data": {
    "id": "uuid",
    "bulan": 1,
    "tahun": 2026,
    "totalBudget": 4000000,
    "budgetKategori": [
      { "kategoriBudgetId": "...", "alokasi": 2500000, "kategoriBudget": { "nama": "Pantry", ... } },
      { "kategoriBudgetId": "...", "alokasi": 1500000, "kategoriBudget": { "nama": "HRD", ... } }
    ],
    "createdAt": "...",
    "updatedAt": "..."
  },
  "meta": { "timestamp": "..." }
}
```

**Error Responses:**
- `409 Conflict`: Budget bulan-tahun sudah ada
- `400 Bad Request`: Validasi (bulan 1–12, rincian minimal 1, alokasi > 0)
- `404 Not Found`: Kategori budget tidak ada / tidak aktif

---

### GET /budget
Get all budget dengan pagination

**Query Parameters:**
- `tahun` (optional): Filter by tahun
- `page` (optional, default: 1): Halaman
- `limit` (optional, default: 20): Jumlah data per halaman

**Example:**
```
GET /api/budget?tahun=2026&page=1&limit=20
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data budget berhasil diambil",
  "data": [
    {
      "id": "uuid",
      "bulan": 1,
      "tahun": 2026,
      "totalBudget": 4000000,
      "budgetKategori": [
        { "kategoriBudgetId": "...", "alokasi": 2500000, "kategoriBudget": { "nama": "Pantry" } },
        { "kategoriBudgetId": "...", "alokasi": 1500000, "kategoriBudget": { "nama": "HRD" } }
      ],
      "_count": { "struk": 5 },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

---

### GET /budget/:id
Get budget by ID (termasuk `budgetKategori` dan list `struk`).

---

### GET /budget/bulan/:bulan/tahun/:tahun
Get budget by bulan and tahun. Response include `budgetKategori` dan `struk`.

---

### GET /budget/:id/summary
Summary: total budget, total pengeluaran, sisa, **rincian per kategori** (alokasi, terpakai, sisa).

**Response (200):**
```json
{
  "success": true,
  "message": "Summary budget berhasil diambil",
  "data": {
    "id": "uuid",
    "bulan": 1,
    "tahun": 2026,
    "totalBudget": 4000000,
    "totalPengeluaran": 1500000,
    "sisaBudget": 2500000,
    "persentaseTerpakai": 37.5,
    "rincianPerKategori": [
      {
        "kategoriBudget": { "id": "...", "nama": "Pantry" },
        "alokasi": 2500000,
        "terpakai": 1000000,
        "sisa": 1500000
      },
      {
        "kategoriBudget": { "id": "...", "nama": "HRD" },
        "alokasi": 1500000,
        "terpakai": 500000,
        "sisa": 1000000
      }
    ],
    "createdAt": "...",
    "updatedAt": "..."
  },
  "meta": { "timestamp": "..." }
}
```

---

### PUT /budget/:id
Update budget (ganti rincian per kategori). Body: `rincian` (array sama seperti create). Total dihitung ulang. Tidak boleh hapus kategori yang sudah dipakai di struk.

---

### DELETE /budget/:id
Delete budget (hanya jika belum ada struk)

**Response (200):**
```json
{
  "success": true,
  "message": "Budget berhasil dihapus",
  "data": {
    "id": "uuid",
    "bulan": 1,
    "tahun": 2026,
    "totalBudget": 5000000
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

**Error Response:**
- `422 Business Logic Error`: Budget tidak dapat dihapus karena sudah memiliki struk

---

## 2. Label Struk Endpoints

### POST /label-struk
Create new label untuk kategorisasi item

**Request Body:**
```json
{
  "nama": "Food and Drink",
  "deskripsi": "Makanan dan minuman",  // Optional
  "warna": "#FF5733"                    // Optional, hex color
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Label berhasil ditambahkan",
  "data": {
    "id": "uuid",
    "nama": "Food and Drink",
    "deskripsi": "Makanan dan minuman",
    "warna": "#FF5733",
    "isAktif": true,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `409 Conflict`: Label dengan nama tersebut sudah ada
- `400 Bad Request`: Validasi error (nama wajib, format warna harus hex)

---

### GET /label-struk
Get all labels dengan pagination

**Query Parameters:**
- `isAktif` (optional): Filter by status aktif (true/false)
- `page` (optional, default: 1): Halaman
- `limit` (optional, default: 50): Jumlah data per halaman

**Example:**
```
GET /api/label-struk?isAktif=true&page=1&limit=50
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data label berhasil diambil",
  "data": [
    {
      "id": "uuid",
      "nama": "Food and Drink",
      "deskripsi": "Makanan dan minuman",
      "warna": "#FF5733",
      "isAktif": true,
      "_count": {
        "strukItem": 15
      },
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "totalPages": 1
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

---

### GET /label-struk/active
Get active labels only (tanpa pagination)

**Response (200):**
```json
{
  "success": true,
  "message": "Data label aktif berhasil diambil",
  "data": [
    {
      "id": "uuid",
      "nama": "Food and Drink",
      "deskripsi": "Makanan dan minuman",
      "warna": "#FF5733",
      "isAktif": true,
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "nama": "Other",
      "deskripsi": "Lainnya",
      "warna": "#33C3F0",
      "isAktif": true,
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

---

### GET /label-struk/:id
Get label by ID

**Response (200):**
```json
{
  "success": true,
  "message": "Data label berhasil diambil",
  "data": {
    "id": "uuid",
    "nama": "Food and Drink",
    "deskripsi": "Makanan dan minuman",
    "warna": "#FF5733",
    "isAktif": true,
    "_count": {
      "strukItem": 15
    },
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

---

### PUT /label-struk/:id
Update label

**Request Body:**
```json
{
  "nama": "Food & Beverage",  // Optional
  "deskripsi": "Updated description",  // Optional
  "warna": "#FF0000",  // Optional
  "isAktif": true  // Optional
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data label berhasil diupdate",
  "data": {
    "id": "uuid",
    "nama": "Food & Beverage",
    "deskripsi": "Updated description",
    "warna": "#FF0000",
    "isAktif": true,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-15T10:30:00.000Z"
  }
}
```

---

### DELETE /label-struk/:id
Delete label (soft delete jika sudah digunakan, hard delete jika belum)

**Response (200):**
```json
{
  "success": true,
  "message": "Label berhasil dihapus",
  "data": {
    "id": "uuid",
    "nama": "Food and Drink",
    "isAktif": false  // Soft delete jika sudah digunakan
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

---

## 3. Struk Endpoints

### POST /struk
Create new struk dengan items

**Request Body:**
```json
{
  "budgetId": "uuid",
  "tanggal": "2026-01-15T10:00:00.000Z",
  "nomorStruk": "STR-001",  // Optional, unique
  "fileBukti": "uploads/struk/2026/01/struk-abc123.jpg",  // Optional
  "namaFileAsli": "Bukti Pembelian Toko ABC.jpg",  // Optional
  "items": [
    {
      "labelStrukId": "uuid",
      "kategoriBudgetId": "uuid-pantry",  // Wajib. Departemen yang menanggung (Pantry/HRD/dll)
      "namaItem": "Nasi Goreng",
      "itemId": "uuid",  // Optional
      "harga": 25000,
      "qty": 2,
      "discountType": "PERSEN",
      "discountValue": 10,
      "keterangan": "Diskon 10%"
    },
    {
      "labelStrukId": "uuid",
      "kategoriBudgetId": "uuid-hrd",
      "namaItem": "Es Teh",
      "harga": 5000,
      "qty": 2,
      "discountType": "BONUS",
      "discountValue": 2000
    }
  ],
  "taxPersen": 10,  // Optional: tax dalam persen (0-100)
  "taxNominal": 0,  // Optional: tax dalam nominal (hanya salah satu dengan taxPersen)
  "keterangan": "Pembelian untuk meeting"  // Optional
}
```

**Note:**
- `taxPersen` dan `taxNominal` hanya boleh salah satu (tidak boleh keduanya)
- Jika `taxPersen` diisi, tax akan dihitung dari total setelah discount
- `discountType`: 
  - `BONUS`: discount berupa nominal tetap (misal: 5000)
  - `PERSEN`: discount berupa persentase (misal: 10 = 10%)
- `discountValue`: 
  - Jika `BONUS`: nilai dalam nominal (rupiah)
  - Jika `PERSEN`: nilai dalam persen (0-100)

**Response (201):**
```json
{
  "success": true,
  "message": "Struk berhasil ditambahkan",
  "data": {
    "id": "uuid",
    "budgetId": "uuid",
    "tanggal": "2026-01-15T10:00:00.000Z",
    "nomorStruk": "STR-001",
    "fileBukti": "uploads/struk/2026/01/struk-abc123.jpg",
    "namaFileAsli": "Bukti Pembelian Toko ABC.jpg",
    "totalHarga": 60000,  // (25000*2) + (5000*2)
    "totalDiscount": 7000,  // (50000*10%) + 2000
    "taxPersen": 10,
    "taxNominal": 5300,  // (60000-7000)*10%
    "totalSetelahTax": 58300,  // 60000 - 7000 + 5300
    "keterangan": "Pembelian untuk meeting",
    "budget": {
      "id": "uuid",
      "bulan": 1,
      "tahun": 2026,
      "totalBudget": 5000000
    },
    "strukItem": [
      {
        "id": "uuid",
        "labelStrukId": "uuid",
        "namaItem": "Nasi Goreng",
        "itemId": "uuid",
        "harga": 25000,
        "qty": 2,
        "subtotal": 50000,
        "discountType": "PERSEN",
        "discountValue": 10,
        "discountNominal": 5000,
        "totalSetelahDiscount": 45000,
        "keterangan": "Diskon 10%",
        "labelStruk": {
          "id": "uuid",
          "nama": "Food and Drink",
          "warna": "#FF5733"
        },
        "item": null,
        "createdAt": "2026-01-15T10:00:00.000Z"
      },
      {
        "id": "uuid",
        "labelStrukId": "uuid",
        "namaItem": "Es Teh",
        "harga": 5000,
        "qty": 2,
        "subtotal": 10000,
        "discountType": "BONUS",
        "discountValue": 2000,
        "discountNominal": 2000,
        "totalSetelahDiscount": 8000,
        "keterangan": null,
        "labelStruk": {
          "id": "uuid",
          "nama": "Food and Drink",
          "warna": "#FF5733"
        },
        "item": null,
        "createdAt": "2026-01-15T10:00:00.000Z"
      }
    ],
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validasi error
- `404 Not Found`: Budget atau label tidak ditemukan
- `409 Conflict`: Nomor struk sudah digunakan

---

### GET /struk
Get all struk dengan pagination

**Query Parameters:**
- `budgetId` (optional): Filter by budget ID
- `tahun` (optional): Filter by tahun
- `bulan` (optional): Filter by bulan (1-12)
- `page` (optional, default: 1): Halaman
- `limit` (optional, default: 20): Jumlah data per halaman

**Example:**
```
GET /api/struk?tahun=2026&bulan=1&page=1&limit=20
GET /api/struk?budgetId=uuid&page=1&limit=20
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data struk berhasil diambil",
  "data": [
    {
      "id": "uuid",
      "budgetId": "uuid",
      "tanggal": "2026-01-15T10:00:00.000Z",
      "nomorStruk": "STR-001",
      "fileBukti": "uploads/struk/2026/01/struk-abc123.jpg",
      "namaFileAsli": "Bukti Pembelian Toko ABC.jpg",
      "totalHarga": 60000,
      "totalDiscount": 7000,
      "taxPersen": 10,
      "taxNominal": 5300,
      "totalSetelahTax": 58300,
      "keterangan": "Pembelian untuk meeting",
      "budget": {
        "id": "uuid",
        "bulan": 1,
        "tahun": 2026,
        "totalBudget": 5000000
      },
      "_count": {
        "strukItem": 2
      },
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

---

### GET /struk/:id
Get struk by ID dengan detail items

**Response (200):**
```json
{
  "success": true,
  "message": "Data struk berhasil diambil",
  "data": {
    "id": "uuid",
    "budgetId": "uuid",
    "tanggal": "2026-01-15T10:00:00.000Z",
    "nomorStruk": "STR-001",
    "fileBukti": "uploads/struk/2026/01/struk-abc123.jpg",
    "namaFileAsli": "Bukti Pembelian Toko ABC.jpg",
    "totalHarga": 60000,
    "totalDiscount": 7000,
    "taxPersen": 10,
    "taxNominal": 5300,
    "totalSetelahTax": 58300,
    "keterangan": "Pembelian untuk meeting",
    "budget": {
      "id": "uuid",
      "bulan": 1,
      "tahun": 2026,
      "totalBudget": 5000000
    },
    "strukItem": [
      {
        "id": "uuid",
        "labelStrukId": "uuid",
        "namaItem": "Nasi Goreng",
        "itemId": "uuid",
        "harga": 25000,
        "qty": 2,
        "subtotal": 50000,
        "discountType": "PERSEN",
        "discountValue": 10,
        "discountNominal": 5000,
        "totalSetelahDiscount": 45000,
        "keterangan": "Diskon 10%",
        "labelStruk": {
          "id": "uuid",
          "nama": "Food and Drink",
          "warna": "#FF5733"
        },
        "item": {
          "id": "uuid",
          "kode": "NASGOR-001",
          "nama": "Nasi Goreng"
        },
        "createdAt": "2026-01-15T10:00:00.000Z"
      }
    ],
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

---

### PUT /struk/:id
Update struk (hanya metadata, tidak bisa update items)

**Request Body:**
```json
{
  "tanggal": "2026-01-16T10:00:00.000Z",  // Optional
  "nomorStruk": "STR-001-UPDATED",  // Optional
  "fileBukti": "uploads/struk/2026/01/struk-updated.jpg",  // Optional
  "namaFileAsli": "Bukti Updated.jpg",  // Optional
  "taxPersen": 11,  // Optional: update tax
  "taxNominal": 0,  // Optional: update tax (hanya salah satu dengan taxPersen)
  "keterangan": "Updated keterangan"  // Optional
}
```

**Note:**
- Jika `taxPersen` atau `taxNominal` diupdate, `totalSetelahTax` akan dihitung ulang
- Items tidak bisa diupdate melalui endpoint ini (harus delete dan create baru)

**Response (200):**
```json
{
  "success": true,
  "message": "Data struk berhasil diupdate",
  "data": {
    "id": "uuid",
    "budgetId": "uuid",
    "tanggal": "2026-01-16T10:00:00.000Z",
    "nomorStruk": "STR-001-UPDATED",
    "fileBukti": "uploads/struk/2026/01/struk-updated.jpg",
    "namaFileAsli": "Bukti Updated.jpg",
    "totalHarga": 60000,
    "totalDiscount": 7000,
    "taxPersen": 11,
    "taxNominal": 5830,
    "totalSetelahTax": 58830,
    "keterangan": "Updated keterangan",
    "budget": {
      "id": "uuid",
      "bulan": 1,
      "tahun": 2026
    },
    "strukItem": [],
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-16T10:00:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-16T10:00:00.000Z"
  }
}
```

---

### DELETE /struk/:id
Delete struk (akan menghapus semua items juga)

**Response (200):**
```json
{
  "success": true,
  "message": "Struk berhasil dihapus",
  "data": {
    "id": "uuid",
    "nomorStruk": "STR-001",
    "totalSetelahTax": 58300
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

---

### GET /struk/rekap/label
Rekap pengeluaran berdasarkan **label** (Food and Drink, Other, dll). Query: `budgetId`, `tahun`, `bulan`.

### GET /struk/rekap/kategori
Rekap pengeluaran berdasarkan **kategori/departemen** (Pantry, HRD, dll). Query: `budgetId`, `tahun`, `bulan`.

**Response (200):**
```json
{
  "success": true,
  "message": "Rekap struk by kategori berhasil diambil",
  "data": [
    {
      "kategoriBudget": { "id": "uuid", "nama": "Pantry", "deskripsi": "...", "isAktif": true },
      "totalPengeluaran": 1500000,
      "totalQty": 50,
      "jumlahItem": 25
    },
    {
      "kategoriBudget": { "id": "uuid", "nama": "HRD", "deskripsi": "...", "isAktif": true },
      "totalPengeluaran": 500000,
      "totalQty": 20,
      "jumlahItem": 10
    }
  ],
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

---

## Flow Penggunaan

### 1. Setup Kategori Budget (Departemen)
```
POST /api/kategori-budget  { "nama": "Pantry", "deskripsi": "..." }
POST /api/kategori-budget  { "nama": "HRD", "deskripsi": "..." }
GET /api/kategori-budget/active   // dipakai untuk dropdown
```

### 2. Setup Budget per bulan (dengan rincian per kategori)
```
POST /api/budget
{
  "bulan": 1,
  "tahun": 2026,
  "rincian": [
    { "kategoriBudgetId": "uuid-pantry", "alokasi": 2500000 },
    { "kategoriBudgetId": "uuid-hrd", "alokasi": 1500000 }
  ]
}
// totalBudget = 4jt (otomatis)
```

### 3. Setup Label (jika belum ada)
```
POST /api/label-struk  { "nama": "Food and Drink", "warna": "#FF5733" }
POST /api/label-struk  { "nama": "Other", "warna": "#33C3F0" }
GET /api/label-struk/active
```

### 4. Create Struk
Tiap item wajib punya `kategoriBudgetId` (departemen yang menanggung). Satu struk bisa mix Pantry + HRD.
```
POST /api/struk
{
  "budgetId": "uuid-budget-januari",
  "tanggal": "2026-01-15T10:00:00.000Z",
  "nomorStruk": "STR-001",
  "items": [
    {
      "labelStrukId": "uuid-food",
      "kategoriBudgetId": "uuid-pantry",
      "namaItem": "Nasi Goreng",
      "harga": 25000,
      "qty": 2,
      "discountType": "PERSEN",
      "discountValue": 10
    },
    {
      "labelStrukId": "uuid-other",
      "kategoriBudgetId": "uuid-hrd",
      "namaItem": "Kertas A4",
      "harga": 50000,
      "qty": 1
    }
  ],
  "taxPersen": 10
}
```

### 5. Cek Summary Budget (total + rincian per kategori)
```
GET /api/budget/{budgetId}/summary
```

### 6. Cek Rekap
```
GET /api/struk/rekap/label?budgetId={id}    // by label (Food, Other)
GET /api/struk/rekap/kategori?budgetId={id} // by departemen (Pantry, HRD)
```

---

## Error Codes

- `400 Bad Request`: Validasi error (format salah, required field kosong)
- `404 Not Found`: Resource tidak ditemukan
- `409 Conflict`: Duplikasi data (budget bulan/tahun sudah ada, nomor struk sudah digunakan, label nama sudah ada)
- `422 Business Logic Error`: Logika bisnis error (budget tidak bisa dihapus karena sudah ada struk)

---

## Catatan Penting

1. **Kategori Budget (Departemen)**: Pantry, HRD, dll. Bisa ditambah/ubah. Dipakai untuk alokasi budget dan assign item struk.
2. **Budget**: Satu per bulan-tahun. Total = jumlah rincian per kategori. Create/update pakai `rincian` (array `{ kategoriBudgetId, alokasi }`).
3. **Label**: Untuk jenis barang (Food, Other). Berdiri sendiri dari kategori budget.
4. **Struk**: 
   - Minimal 1 item. Tiap item wajib `kategoriBudgetId` (harus salah satu kategori di budget bulan itu).
   - Satu struk boleh gabung banyak kategori (mis. item Pantry + item HRD).
   - Nomor struk unique (jika diisi). Tax persen atau nominal (salah satu).
   - Discount per item: BONUS atau PERSEN.
5. **File Upload**: `fileBukti`, `namaFileAsli` untuk bukti struk.
6. **Calculation**:
   - `subtotal` = `harga * qty`
   - `discountNominal` = dihitung berdasarkan `discountType` dan `discountValue`
   - `totalSetelahDiscount` = `subtotal - discountNominal`
   - `totalHarga` = sum semua `subtotal`
   - `totalDiscount` = sum semua `discountNominal`
   - `taxNominal` = dihitung dari `totalSetelahDiscount` jika `taxPersen`, atau langsung dari `taxNominal`
   - `totalSetelahTax` = `totalHarga - totalDiscount + taxNominal`
