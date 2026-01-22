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

## 1. Budget Endpoints

### POST /budget
Create new budget untuk bulan tertentu

**Request Body:**
```json
{
  "bulan": 1,           // 1-12 (Januari-Desember)
  "tahun": 2026,
  "totalBudget": 5000000  // Total budget dalam rupiah
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Budget berhasil ditambahkan",
  "data": {
    "id": "uuid",
    "bulan": 1,
    "tahun": 2026,
    "totalBudget": 5000000,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `409 Conflict`: Budget untuk bulan dan tahun tersebut sudah ada
- `400 Bad Request`: Validasi error (bulan harus 1-12, totalBudget harus > 0)

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
      "totalBudget": 5000000,
      "_count": {
        "struk": 5
      },
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z"
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
Get budget by ID

**Response (200):**
```json
{
  "success": true,
  "message": "Data budget berhasil diambil",
  "data": {
    "id": "uuid",
    "bulan": 1,
    "tahun": 2026,
    "totalBudget": 5000000,
    "struk": [
      {
        "id": "uuid",
        "tanggal": "2026-01-15T10:00:00.000Z",
        "totalSetelahTax": 150000,
        "_count": {
          "strukItem": 3
        }
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

### GET /budget/bulan/:bulan/tahun/:tahun
Get budget by bulan and tahun

**Example:**
```
GET /api/budget/bulan/1/tahun/2026
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data budget berhasil diambil",
  "data": {
    "id": "uuid",
    "bulan": 1,
    "tahun": 2026,
    "totalBudget": 5000000,
    "struk": [],
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

---

### GET /budget/:id/summary
Get budget summary (total budget, total pengeluaran, sisa budget)

**Response (200):**
```json
{
  "success": true,
  "message": "Summary budget berhasil diambil",
  "data": {
    "id": "uuid",
    "bulan": 1,
    "tahun": 2026,
    "totalBudget": 5000000,
    "totalPengeluaran": 1500000,
    "sisaBudget": 3500000,
    "persentaseTerpakai": 30,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-15T10:00:00.000Z"
  }
}
```

---

### PUT /budget/:id
Update budget

**Request Body:**
```json
{
  "totalBudget": 6000000  // Optional
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data budget berhasil diupdate",
  "data": {
    "id": "uuid",
    "bulan": 1,
    "tahun": 2026,
    "totalBudget": 6000000,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-15T10:30:00.000Z"
  }
}
```

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
      "namaItem": "Nasi Goreng",
      "itemId": "uuid",  // Optional, bisa relasi ke Item atau custom
      "harga": 25000,
      "qty": 2,
      "discountType": "PERSEN",  // Optional: "BONUS" atau "PERSEN"
      "discountValue": 10,  // Optional: nominal jika BONUS, persen jika PERSEN
      "keterangan": "Diskon 10%"  // Optional
    },
    {
      "labelStrukId": "uuid",
      "namaItem": "Es Teh",
      "harga": 5000,
      "qty": 2,
      "discountType": "BONUS",
      "discountValue": 2000  // Discount nominal 2000
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
Get rekap pengeluaran berdasarkan label

**Query Parameters:**
- `budgetId` (optional): Filter by budget ID
- `tahun` (optional): Filter by tahun
- `bulan` (optional): Filter by bulan (1-12)

**Example:**
```
GET /api/struk/rekap/label?tahun=2026&bulan=1
GET /api/struk/rekap/label?budgetId=uuid
```

**Response (200):**
```json
{
  "success": true,
  "message": "Rekap struk by label berhasil diambil",
  "data": [
    {
      "label": {
        "id": "uuid",
        "nama": "Food and Drink",
        "deskripsi": "Makanan dan minuman",
        "warna": "#FF5733",
        "isAktif": true
      },
      "totalPengeluaran": 1500000,
      "totalQty": 50,
      "jumlahItem": 25
    },
    {
      "label": {
        "id": "uuid",
        "nama": "Other",
        "deskripsi": "Lainnya",
        "warna": "#33C3F0",
        "isAktif": true
      },
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

### 1. Setup Budget
```
POST /api/budget
{
  "bulan": 1,
  "tahun": 2026,
  "totalBudget": 5000000
}
```

### 2. Setup Label (jika belum ada)
```
POST /api/label-struk
{
  "nama": "Food and Drink",
  "warna": "#FF5733"
}

POST /api/label-struk
{
  "nama": "Other",
  "warna": "#33C3F0"
}
```

### 3. Create Struk
```
POST /api/struk
{
  "budgetId": "uuid-dari-step-1",
  "tanggal": "2026-01-15T10:00:00.000Z",
  "nomorStruk": "STR-001",
  "items": [
    {
      "labelStrukId": "uuid-food-and-drink",
      "namaItem": "Nasi Goreng",
      "harga": 25000,
      "qty": 2,
      "discountType": "PERSEN",
      "discountValue": 10
    }
  ],
  "taxPersen": 10
}
```

### 4. Cek Summary Budget
```
GET /api/budget/{budgetId}/summary
```

### 5. Cek Rekap by Label
```
GET /api/struk/rekap/label?budgetId={budgetId}
```

---

## Error Codes

- `400 Bad Request`: Validasi error (format salah, required field kosong)
- `404 Not Found`: Resource tidak ditemukan
- `409 Conflict`: Duplikasi data (budget bulan/tahun sudah ada, nomor struk sudah digunakan, label nama sudah ada)
- `422 Business Logic Error`: Logika bisnis error (budget tidak bisa dihapus karena sudah ada struk)

---

## Catatan Penting

1. **Budget**: Satu budget per bulan-tahun (unique constraint)
2. **Label**: Bisa ditambah kapan saja, soft delete jika sudah digunakan
3. **Struk**: 
   - Harus memiliki minimal 1 item
   - Nomor struk unique (jika diisi)
   - Tax bisa persen atau nominal (hanya salah satu)
   - Discount per item bisa BONUS (nominal) atau PERSEN
4. **File Upload**: Field `fileBukti` dan `namaFileAsli` untuk menyimpan path dan nama file asli dari upload
5. **Calculation**:
   - `subtotal` = `harga * qty`
   - `discountNominal` = dihitung berdasarkan `discountType` dan `discountValue`
   - `totalSetelahDiscount` = `subtotal - discountNominal`
   - `totalHarga` = sum semua `subtotal`
   - `totalDiscount` = sum semua `discountNominal`
   - `taxNominal` = dihitung dari `totalSetelahDiscount` jika `taxPersen`, atau langsung dari `taxNominal`
   - `totalSetelahTax` = `totalHarga - totalDiscount + taxNominal`
