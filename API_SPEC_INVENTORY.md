# API Specification - Sistem Inventory ATK & Obat

## Base URL
```
http://localhost:3000/api
```

## Authentication
**Note:** API ini belum menggunakan authentication/authorization. Semua endpoint bisa diakses tanpa token.

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Pesan sukses",
  "data": {} | []
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
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Pesan error",
  "error": "Detail error"
}
```

**Common Error Status Codes:**
- `400 Bad Request`: Validation error (Zod validation failed)
- `404 Not Found`: Resource tidak ditemukan
- `500 Internal Server Error`: Server error

---

## Important Notes

### Route Order
Routes dalam Express dieksekusi secara berurutan. Oleh karena itu, route dengan path spesifik harus didefinisikan **sebelum** route dengan parameter dinamis:

**✅ Correct Order:**
```javascript
router.get('/item/stok-menipis', ...)  // Harus sebelum /:id
router.get('/item/:id', ...)            // Dynamic parameter

router.get('/pembelian/rekap', ...)     // Harus sebelum /:id
router.get('/pembelian/:id', ...)       // Dynamic parameter

router.get('/pengeluaran/rekap', ...)   // Harus sebelum /:id
router.get('/pengeluaran/:id', ...)     // Dynamic parameter
```

**❌ Wrong Order:**
```javascript
router.get('/item/:id', ...)            // Akan match semua, termasuk "stok-menipis"
router.get('/item/stok-menipis', ...)   // Tidak akan pernah tercapai
```

### DateTime Format
Semua field `tanggal` harus dalam format ISO 8601:
- Format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Contoh: `2026-01-13T10:30:00.000Z`
- Timezone: UTC (Z)

### Pagination
- Default page: 1
- Default limit: 20
- Max limit: 100 (bisa disesuaikan di backend)

---

## 1. Item Endpoints

### POST /item
Create new item (ATK atau Obat)

**Request Body:**
```json
{
  "kode": "ATK001",
  "nama": "Pulpen Hitam",
  "kategori": "ATK", // "ATK" | "OBAT"
  "satuan": "pcs", // pcs, box, rim, botol, tablet, strip, dll
  "stokMinimal": 10, // optional, default: 0
  "stokSekarang": 50, // optional, default: 0
  "keterangan": "Pulpen hitam 0.5mm" // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Item berhasil dibuat",
  "data": {
    "id": "uuid",
    "kode": "ATK001",
    "nama": "Pulpen Hitam",
    "kategori": "ATK",
    "satuan": "pcs",
    "stokMinimal": 10,
    "stokSekarang": 50,
    "keterangan": "Pulpen hitam 0.5mm",
    "createdAt": "2026-01-13T10:30:00.000Z",
    "updatedAt": "2026-01-13T10:30:00.000Z"
  }
}
```

**Validation Rules:**
- `kode` (required): Unique, minimal 1 karakter
- `nama` (required): Minimal 1 karakter
- `kategori` (required): "ATK" | "OBAT"
- `satuan` (required): Minimal 1 karakter
- `stokMinimal` (optional): Integer >= 0, default: 0
- `stokSekarang` (optional): Integer >= 0, default: 0

**Error Responses:**
- `400 Bad Request`: Validation error (Zod validation)
- `400 Bad Request`: Kode item sudah digunakan

---

### GET /item
Get list items dengan filter dan pagination

**Query Parameters:**
- `kategori` (optional): "ATK" | "OBAT"
- `kode` (optional): String, search by kode (contains, case-insensitive)
- `nama` (optional): String, search by nama (contains, case-insensitive)
- `stokMenipis` (optional): Boolean, filter item dengan stok <= stokMinimal
- `page` (optional): Integer, default: 1
- `limit` (optional): Integer, default: 20

**Example:**
```
GET /item?kategori=ATK&page=1&limit=10
GET /item?stokMenipis=true
GET /item?nama=pulpen
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data item berhasil diambil",
  "data": [
    {
      "id": "uuid",
      "kode": "ATK001",
      "nama": "Pulpen Hitam",
      "kategori": "ATK",
      "satuan": "pcs",
      "stokMinimal": 10,
      "stokSekarang": 5,
      "keterangan": "Pulpen hitam 0.5mm",
      "createdAt": "2026-01-13T10:30:00.000Z",
      "updatedAt": "2026-01-13T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### GET /item/:id
Get item by ID with transaction history

**Path Parameters:**
- `id` (required): UUID item

**Response (200):**
```json
{
  "success": true,
  "message": "Data item berhasil diambil",
  "data": {
    "id": "uuid",
    "kode": "ATK001",
    "nama": "Pulpen Hitam",
    "kategori": "ATK",
    "satuan": "pcs",
    "stokMinimal": 10,
    "stokSekarang": 50,
    "keterangan": "Pulpen hitam 0.5mm",
    "createdAt": "2026-01-13T10:30:00.000Z",
    "updatedAt": "2026-01-13T10:30:00.000Z",
    "pembelian": [
      {
        "id": "uuid",
        "jumlah": 100,
        "tanggal": "2026-01-10T00:00:00.000Z",
        "supplier": "Toko ATK Sejahtera",
        "hargaSatuan": 2000,
        "totalHarga": 200000,
        "keterangan": "Pembelian bulanan",
        "createdAt": "2026-01-10T10:30:00.000Z"
      }
    ],
    "pengeluaran": [
      {
        "id": "uuid",
        "jumlah": 50,
        "tanggal": "2026-01-12T00:00:00.000Z",
        "keperluan": "Kebutuhan kantor",
        "penerima": "Bagian Umum",
        "keterangan": "Distribusi ke kantor cabang",
        "createdAt": "2026-01-12T10:30:00.000Z"
      }
    ]
  }
}
```

**Error Responses:**
- `404 Not Found`: Item not found

---

### PUT /item/:id
Update item

**Path Parameters:**
- `id` (required): UUID item

**Request Body (all fields optional):**
```json
{
  "nama": "Pulpen Hitam Premium",
  "satuan": "pcs",
  "stokMinimal": 15,
  "keterangan": "Updated description"
}
```

**Note:** 
- `kode`, `kategori`, dan `stokSekarang` tidak bisa diubah melalui endpoint ini
- `stokSekarang` hanya bisa diupdate otomatis melalui transaksi pembelian/pengeluaran

**Response (200):**
```json
{
  "success": true,
  "message": "Item berhasil diupdate",
  "data": {
    "id": "uuid",
    "kode": "ATK001",
    "nama": "Pulpen Hitam Premium",
    "kategori": "ATK",
    "satuan": "pcs",
    "stokMinimal": 15,
    "stokSekarang": 50,
    "keterangan": "Updated description",
    "createdAt": "2026-01-13T10:30:00.000Z",
    "updatedAt": "2026-01-13T11:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `404 Not Found`: Item not found

---

### DELETE /item/:id
Delete item

**Path Parameters:**
- `id` (required): UUID item

**Note:** Item dengan history transaksi pembelian atau pengeluaran tidak bisa dihapus

**Response (200):**
```json
{
  "success": true,
  "message": "Item berhasil dihapus",
  "data": {
    "id": "uuid",
    "kode": "ATK001",
    "nama": "Pulpen Hitam"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Item memiliki history transaksi
- `404 Not Found`: Item not found

---

## 2. Pembelian Endpoints (Stock Masuk)

### POST /pembelian
Create new pembelian (stock masuk)

**Request Body:**
```json
{
  "itemId": "uuid",
  "jumlah": 100,
  "tanggal": "2026-01-13T00:00:00.000Z", // ISO 8601 datetime string
  "supplier": "Toko ATK Sejahtera", // optional
  "hargaSatuan": 2000,
  "keterangan": "Pembelian bulanan" // optional
}
```

**Note:** `totalHarga` dihitung otomatis = `jumlah * hargaSatuan`

**Response (201):**
```json
{
  "success": true,
  "message": "Pembelian berhasil dicatat",
  "data": {
    "id": "uuid",
    "itemId": "uuid",
    "jumlah": 100,
    "tanggal": "2026-01-13T00:00:00.000Z",
    "supplier": "Toko ATK Sejahtera",
    "hargaSatuan": 2000,
    "totalHarga": 200000,
    "keterangan": "Pembelian bulanan",
    "createdAt": "2026-01-13T10:30:00.000Z",
    "item": {
      "kode": "ATK001",
      "nama": "Pulpen Hitam",
      "stokSekarang": 150 // updated after purchase
    }
  }
}
```

**Business Rules:**
- Stok item akan otomatis bertambah sejumlah `jumlah`
- `totalHarga` = `jumlah * hargaSatuan` (auto-calculated)

**Validation Rules:**
- `itemId` (required): Valid UUID
- `jumlah` (required): Integer > 0
- `tanggal` (required): Valid ISO 8601 datetime string
- `hargaSatuan` (required): Integer >= 0 (dalam rupiah)
- `supplier` (optional): String
- `keterangan` (optional): String

**Error Responses:**
- `400 Bad Request`: Validation error
- `404 Not Found`: Item not found

---

### GET /pembelian
Get list pembelian dengan filter dan pagination

**Query Parameters:**
- `itemId` (optional): UUID, filter by item
- `kategori` (optional): "ATK" | "OBAT", filter by kategori item
- `supplier` (optional): String, search by supplier (contains, case-insensitive)
- `tanggalMulai` (optional): ISO date string, filter >= tanggal ini
- `tanggalSelesai` (optional): ISO date string, filter <= tanggal ini
- `page` (optional): Integer, default: 1
- `limit` (optional): Integer, default: 20

**Example:**
```
GET /pembelian?itemId=uuid&page=1&limit=10
GET /pembelian?kategori=ATK&tanggalMulai=2026-01-01&tanggalSelesai=2026-01-31
GET /pembelian?supplier=toko
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data pembelian berhasil diambil",
  "data": [
    {
      "id": "uuid",
      "itemId": "uuid",
      "jumlah": 100,
      "tanggal": "2026-01-13T00:00:00.000Z",
      "supplier": "Toko ATK Sejahtera",
      "hargaSatuan": 2000,
      "totalHarga": 200000,
      "keterangan": "Pembelian bulanan",
      "createdAt": "2026-01-13T10:30:00.000Z",
      "item": {
        "kode": "ATK001",
        "nama": "Pulpen Hitam",
        "kategori": "ATK",
        "satuan": "pcs"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### GET /pembelian/:id
Get pembelian by ID

**Path Parameters:**
- `id` (required): UUID pembelian

**Response (200):**
```json
{
  "success": true,
  "message": "Data pembelian berhasil diambil",
  "data": {
    "id": "uuid",
    "itemId": "uuid",
    "jumlah": 100,
    "tanggal": "2026-01-13T00:00:00.000Z",
    "supplier": "Toko ATK Sejahtera",
    "hargaSatuan": 2000,
    "totalHarga": 200000,
    "keterangan": "Pembelian bulanan",
    "createdAt": "2026-01-13T10:30:00.000Z",
    "item": {
      "id": "uuid",
      "kode": "ATK001",
      "nama": "Pulpen Hitam",
      "kategori": "ATK",
      "satuan": "pcs",
      "stokSekarang": 150
    }
  }
}
```

**Error Responses:**
- `404 Not Found`: Pembelian not found

---

### PUT /pembelian/:id
Update pembelian

**Path Parameters:**
- `id` (required): UUID pembelian

**Request Body (all fields optional except itemId):**
```json
{
  "jumlah": 120,
  "tanggal": "2026-01-13T00:00:00.000Z",
  "supplier": "Toko ATK Baru",
  "hargaSatuan": 2500,
  "keterangan": "Updated"
}
```

**Note:** 
- Mengubah `jumlah` akan menyesuaikan stok (rollback jumlah lama, tambah jumlah baru)
- `totalHarga` otomatis recalculate
- `itemId` tidak bisa diubah

**Response (200):**
```json
{
  "success": true,
  "message": "Pembelian berhasil diupdate",
  "data": {
    "id": "uuid",
    "itemId": "uuid",
    "jumlah": 120,
    "tanggal": "2026-01-13T00:00:00.000Z",
    "supplier": "Toko ATK Baru",
    "hargaSatuan": 2500,
    "totalHarga": 300000,
    "keterangan": "Updated",
    "createdAt": "2026-01-13T10:30:00.000Z",
    "item": {
      "stokSekarang": 170 // adjusted
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `404 Not Found`: Pembelian not found

---

### DELETE /pembelian/:id
Delete pembelian (rollback stock)

**Path Parameters:**
- `id` (required): UUID pembelian

**Note:** Stok item akan otomatis dikurangi sejumlah pembelian

**Response (200):**
```json
{
  "success": true,
  "message": "Pembelian berhasil dihapus",
  "data": {
    "id": "uuid",
    "jumlah": 100,
    "item": {
      "stokSekarang": 50 // updated after rollback
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Stok tidak cukup untuk rollback (stok < jumlah pembelian)
- `404 Not Found`: Pembelian not found

---

## 3. Pengeluaran Endpoints (Stock Keluar)

### POST /pengeluaran
Create new pengeluaran (stock keluar)

**Request Body:**
```json
{
  "itemId": "uuid",
  "jumlah": 50,
  "tanggal": "2026-01-13T00:00:00.000Z", // ISO 8601 datetime string
  "keperluan": "Kebutuhan kantor",
  "penerima": "Bagian Umum", // optional
  "keterangan": "Distribusi ke kantor cabang" // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Pengeluaran berhasil dicatat",
  "data": {
    "id": "uuid",
    "itemId": "uuid",
    "jumlah": 50,
    "tanggal": "2026-01-13T00:00:00.000Z",
    "keperluan": "Kebutuhan kantor",
    "penerima": "Bagian Umum",
    "keterangan": "Distribusi ke kantor cabang",
    "createdAt": "2026-01-13T10:30:00.000Z",
    "item": {
      "kode": "ATK001",
      "nama": "Pulpen Hitam",
      "stokSekarang": 100 // updated after pengeluaran
    }
  }
}
```

**Business Rules:**
- Stok item akan otomatis berkurang sejumlah `jumlah`
- Pengeluaran bisa dilakukan meskipun stok menjadi negatif (untuk kasus emergency)

**Validation Rules:**
- `itemId` (required): Valid UUID string
- `keperluan` (required): Minimal 1 karakter
- `penerima` (optional): String
- `keterangan` (optional): String
- `tanggal` (required): Valid ISO 8601 datetime
- `keperluan` (required): Minimal 1 karakter

**Error Responses:**
- `400 Bad Request`: Validation error
- `404 Not Found`: Item not found

---

### GET /pengeluaran
Get list pengeluaran dengan filter dan pagination

**Query Parameters:**
- `itemId` (optional): UUID, filter by item
- `kategori` (optional): "ATK" | "OBAT", filter by kategori item
- `keperluan` (optional): String, search by keperluan (contains, case-insensitive)
- `penerima` (optional): String, search by penerima (contains, case-insensitive)
- `tanggalMulai` (optional): ISO date string, filter >= tanggal ini
- `tanggalSelesai` (optional): ISO date string, filter <= tanggal ini
- `page` (optional): Integer, default: 1
- `limit` (optional): Integer, default: 20

**Example:**
```
GET /pengeluaran?itemId=uuid&page=1&limit=10
GET /pengeluaran?kategori=OBAT&tanggalMulai=2026-01-01&tanggalSelesai=2026-01-31
GET /pengeluaran?penerima=bagian
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data pengeluaran berhasil diambil",
  "data": [
    {
      "id": "uuid",
      "itemId": "uuid",
      "jumlah": 50,
      "tanggal": "2026-01-13T00:00:00.000Z",
      "keperluan": "Kebutuhan kantor",
      "penerima": "Bagian Umum",
      "keterangan": "Distribusi ke kantor cabang",
      "createdAt": "2026-01-13T10:30:00.000Z",
      "item": {
        "kode": "ATK001",
        "nama": "Pulpen Hitam",
        "kategori": "ATK",
        "satuan": "pcs"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### GET /pengeluaran/:id
Get pengeluaran by ID

**Path Parameters:**
- `id` (required): UUID pengeluaran

**Response (200):**
```json
{
  "success": true,
  "message": "Data pengeluaran berhasil diambil",
  "data": {
    "id": "uuid",
    "itemId": "uuid",
    "jumlah": 50,
    "tanggal": "2026-01-13T00:00:00.000Z",
    "keperluan": "Kebutuhan kantor",
    "penerima": "Bagian Umum",
    "keterangan": "Distribusi ke kantor cabang",
    "createdAt": "2026-01-13T10:30:00.000Z",
    "item": {
      "id": "uuid",
      "kode": "ATK001",
      "nama": "Pulpen Hitam",
      "kategori": "ATK",
      "satuan": "pcs",
      "stokSekarang": 100
    }
  }
}
```

**Error Responses:**
- `404 Not Found`: Pengeluaran not found

---

### PUT /pengeluaran/:id
Update pengeluaran

**Path Parameters:**
- `id` (required): UUID pengeluaran

**Request Body (all fields optional except itemId):**
```json
{
  "jumlah": 60,
  "tanggal": "2026-01-13T00:00:00.000Z",
  "keperluan": "Updated keperluan",
  "penerima": "Bagian Lain",
  "keterangan": "Updated"
}
```

**Note:** 
- Mengubah `jumlah` akan menyesuaikan stok (rollback jumlah lama, kurangi jumlah baru)
- `itemId` tidak bisa diubah

**Response (200):**
```json
{
  "success": true,
  "message": "Pengeluaran berhasil diupdate",
  "data": {
    "id": "uuid",
    "itemId": "uuid",
    "jumlah": 60,
    "tanggal": "2026-01-13T00:00:00.000Z",
    "keperluan": "Updated keperluan",
    "penerima": "Bagian Lain",
    "keterangan": "Updated",
    "createdAt": "2026-01-13T10:30:00.000Z",
    "item": {
      "stokSekarang": 90 // adjusted
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `404 Not Found`: Pengeluaran not found

---

### DELETE /pengeluaran/:id
Delete pengeluaran (rollback stock)

**Path Parameters:**
- `id` (required): UUID pengeluaran

**Note:** Stok item akan otomatis bertambah kembali sejumlah pengeluaran

**Response (200):**
```json
{
  "success": true,
  "message": "Pengeluaran berhasil dihapus",
  "data": {
    "id": "uuid",
    "jumlah": 50,
    "item": {
      "stokSekarang": 150 // updated after rollback
    }
  }
}
```

**Error Responses:**
- `404 Not Found`: Pengeluaran not found

---

## 4. Laporan & Dashboard

### GET /item/stok-menipis
Get items dengan stok <= stokMinimal

**Query Parameters:**
- `kategori` (optional): "ATK" | "OBAT"

**Example:**
```
GET /item/stok-menipis?kategori=ATK
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data item stok menipis berhasil diambil",
  "data": [
    {
      "id": "uuid",
      "kode": "ATK001",
      "nama": "Pulpen Hitam",
      "kategori": "ATK",
      "satuan": "pcs",
      "stokMinimal": 10,
      "stokSekarang": 5,
      "selisih": -5 // stokSekarang - stokMinimal
    }
  ]
}
```

---

### GET /pembelian/rekap
Get rekap pembelian berdasarkan periode

**Query Parameters:**
- `kategori` (optional): "ATK" | "OBAT"
- `tanggalMulai` (required): ISO date string
- `tanggalSelesai` (required): ISO date string
- `groupBy` (optional): "item" | "supplier", default: "item"

**Example:**
```
GET /pembelian/rekap?tanggalMulai=2026-01-01&tanggalSelesai=2026-01-31&groupBy=item
GET /pembelian/rekap?kategori=ATK&tanggalMulai=2026-01-01&tanggalSelesai=2026-01-31&groupBy=supplier
```

**Response (200) - groupBy=item:**
```json
{
  "success": true,
  "message": "Rekap pembelian berhasil diambil",
  "data": {
    "periode": {
      "mulai": "2026-01-01",
      "selesai": "2026-01-31"
    },
    "totalNilai": 5000000,
    "rekap": [
      {
        "itemId": "uuid",
        "kode": "ATK001",
        "nama": "Pulpen Hitam",
        "kategori": "ATK",
        "totalJumlah": 500,
        "totalNilai": 1000000,
        "totalTransaksi": 5
      }
    ]
  }
}
```

**Response (200) - groupBy=supplier:**
```json
{
  "success": true,
  "message": "Rekap pembelian berhasil diambil",
  "data": {
    "periode": {
      "mulai": "2026-01-01",
      "selesai": "2026-01-31"
    },
    "totalNilai": 5000000,
    "rekap": [
      {
        "supplier": "Toko ATK Sejahtera",
        "totalNilai": 3000000,
        "totalTransaksi": 10
      }
    ]
  }
}
```

---

### GET /pengeluaran/rekap
Get rekap pengeluaran berdasarkan periode

**Query Parameters:**
- `kategori` (optional): "ATK" | "OBAT"
- `tanggalMulai` (required): ISO date string
- `tanggalSelesai` (required): ISO date string
- `groupBy` (optional): "item" | "keperluan" | "penerima", default: "item"

**Example:**
```
GET /pengeluaran/rekap?tanggalMulai=2026-01-01&tanggalSelesai=2026-01-31&groupBy=item
GET /pengeluaran/rekap?kategori=OBAT&tanggalMulai=2026-01-01&tanggalSelesai=2026-01-31&groupBy=keperluan
```

**Response (200) - groupBy=item:**
```json
{
  "success": true,
  "message": "Rekap pengeluaran berhasil diambil",
  "data": {
    "periode": {
      "mulai": "2026-01-01",
      "selesai": "2026-01-31"
    },
    "rekap": [
      {
        "itemId": "uuid",
        "kode": "ATK001",
        "nama": "Pulpen Hitam",
        "kategori": "ATK",
        "totalJumlah": 250,
        "totalTransaksi": 8
      }
    ]
  }
}
```

**Response (200) - groupBy=keperluan:**
```json
{
  "success": true,
  "message": "Rekap pengeluaran berhasil diambil",
  "data": {
    "periode": {
      "mulai": "2026-01-01",
      "selesai": "2026-01-31"
    },
    "rekap": [
      {
        "keperluan": "Kebutuhan kantor",
        "totalJumlah": 150,
        "totalTransaksi": 5
      }
    ]
  }
}
```

---

## Notes

### Business Logic

1. **Stock Management:**
   - Pembelian menambah `stokSekarang` (stock in)
   - Pengeluaran mengurangi `stokSekarang` (stock out)
   - Stok bisa negatif untuk kasus emergency (tidak ada validasi minimum stok saat pengeluaran)
   - Alert otomatis jika `stokSekarang <= stokMinimal`

2. **Validation:**
   - Kode item harus unique per kategori
   - Jumlah harus > 0 untuk transaksi
   - Tanggal harus valid ISO 8601 datetime string
   - Harga satuan >= 0 (boleh 0 untuk gratis/hibah)

3. **Transaction Management:**
   - Update/delete pembelian akan adjust stok (rollback old jumlah, apply new jumlah)
   - Update/delete pengeluaran akan adjust stok (rollback old jumlah, apply new jumlah)
   - Delete pembelian: cek apakah stok cukup untuk rollback
   - Menggunakan database transaction untuk konsistensi data

4. **Reporting:**
   - Rekap bisa difilter berdasarkan kategori (ATK/OBAT)
   - Rekap bisa difilter berdasarkan periode tanggal (tanggalMulai & tanggalSelesai)
   - Support multiple grouping:
     - Pembelian: by item atau supplier
     - Pengeluaran: by item, keperluan, atau penerima

5. **Data Integrity:**
   - Item tidak bisa dihapus jika memiliki history transaksi (pembelian atau pengeluaran)
   - Field `kode` dan `kategori` di Item tidak bisa diubah setelah dibuat
   - Field `itemId` di Pembelian dan Pengeluaran tidak bisa diubah
   - `totalHarga` di Pembelian auto-calculated saat create/update (jumlah * hargaSatuan)

### Frontend Implementation Guide

**Halaman yang Sudah Diimplementasikan:**
1. `/inventory` - Dashboard Inventory (stok menipis, quick stats, quick access)
2. `/item` - List & CRUD master item (dengan filter dan pagination)
3. `/item/tambah` - Form tambah item baru
4. `/item/:id` - Form edit item
5. `/pembelian` - List & CRUD transaksi pembelian (dengan filter dan pagination)
6. `/pembelian/tambah` - Form tambah pembelian
7. `/pembelian/:id` - Form edit pembelian
8. `/pengeluaran` - List & CRUD transaksi pengeluaran (dengan filter dan pagination)
9. `/pengeluaran/tambah` - Form tambah pengeluaran
10. `/pengeluaran/:id` - Form edit pengeluaran
11. `/inventory/laporan` - Laporan rekap pembelian & pengeluaran (dengan grouping options)

**Key Features yang Sudah Ada:**
- Alert badge untuk item stok menipis
- Filter by kategori (ATK/OBAT)
- Search by kode/nama/supplier/keperluan/penerima
- Date range picker untuk laporan
- Real-time stock update display
- Auto-calculate totalHarga di pembelian
- Pagination untuk semua list
- Form validation dengan Zod schema
- Toast notifications untuk success/error
- Loading states

**Tech Stack Frontend:**
- Next.js 16 (App Router)
- TypeScript
- React Query (TanStack Query) untuk data fetching
- React Hook Form + Zod untuk form validation
- Tailwind CSS + shadcn/ui untuk styling
- Axios untuk HTTP client
