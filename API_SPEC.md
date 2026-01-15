# API Specification - Sistem Manajemen Cuti Karyawan

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

---

## 1. Health Check

### GET /health
Check API status

**Response:**
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-01-09T10:30:00.000Z"
}
```

---

## 2. Karyawan Endpoints

### POST /karyawan
Create new karyawan

**Request Body:**
```json
{
  "nik": "123456789",
  "fingerprintId": 101, // optional, positive integer
  "nama": "John Doe",
  "jabatan": "Software Engineer", // optional
  "departemen": "IT", // optional
  "tanggalMasuk": "2025-01-15T00:00:00.000Z" // ISO 8601 datetime string
}
```

**Alternative (backward compatibility):**
```json
{
  "nik": "123456789",
  "nama": "John Doe",
  "tanggal_bergabung": "2025-01-15T00:00:00.000Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Karyawan berhasil ditambahkan",
  "data": {
    "id": "uuid",
    "nik": "123456789",
    "fingerprintId": 101,
    "nama": "John Doe",
    "jabatan": "Software Engineer",
    "departemen": "IT",
    "tanggalMasuk": "2025-01-15T00:00:00.000Z",
    "status": "AKTIF",
    "createdAt": "2026-01-09T10:30:00.000Z",
    "updatedAt": "2026-01-09T10:30:00.000Z"
  }
}
```

**Validation Rules:**
- `nik` (required): Minimal 1 karakter, unique
- `fingerprintId` (optional): Positive integer, unique (untuk matching dengan mesin absensi fingerprint)
- `nama` (required): Minimal 1 karakter
- `tanggalMasuk` or `tanggal_bergabung` (required): Valid ISO 8601 datetime string
- `jabatan` (optional): String
- `departemen` (optional): String

**Error Responses:**
- `400 Bad Request`: Validation error
- `409 Conflict`: NIK already exists

---

### GET /karyawan
Get all karyawan

**Query Parameters:**
- `status` (optional): "AKTIF" | "NONAKTIF"

**Example:**
```
GET /karyawan?status=AKTIF
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data karyawan berhasil diambil",
  "data": [
    {
      "id": "uuid",
      "nik": "123456789",
      "fingerprintId": 101,
      "nama": "John Doe",
      "jabatan": "Software Engineer",
      "departemen": "IT",
      "tanggalMasuk": "2025-01-15T00:00:00.000Z",
      "status": "AKTIF",
      "createdAt": "2026-01-09T10:30:00.000Z",
      "updatedAt": "2026-01-09T10:30:00.000Z"
    }
  ]
}
```

---

### PUT /cuti/:id
Update data cuti

**URL Parameters:**
- `id` (required): UUID cuti yang akan diupdate

**Request Body:**
Semua field bersifat optional, kirim hanya field yang ingin diubah:
```json
{
  "jenis": "SAKIT", // optional: TAHUNAN | SAKIT | IZIN | BAKU | TANPA_KETERANGAN | LAINNYA
  "alasan": "Alasan baru", // optional
  "tanggalMulai": "2026-01-20T00:00:00.000Z", // optional: ISO 8601 datetime
  "tanggalSelesai": "2026-01-22T00:00:00.000Z" // optional: ISO 8601 datetime
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Cuti berhasil diupdate",
  "data": {
    "id": "uuid",
    "karyawanId": "uuid",
    "cutiTahunanId": "uuid",
    "tahun": 2026,
    "jenis": "SAKIT",
    "alasan": "Alasan baru",
    "tanggalMulai": "2026-01-20T00:00:00.000Z",
    "tanggalSelesai": "2026-01-22T00:00:00.000Z",
    "jumlahHari": 3,
    "createdAt": "2026-01-13T10:00:00.000Z",
    "updatedAt": "2026-01-13T11:00:00.000Z",
    "karyawan": {
      "id": "uuid",
      "nik": "123456789",
      "nama": "John Doe"
    }
  }
}
```

**Business Logic:**
- Saldo cuti lama akan di-rollback terlebih dahulu (jika jenis TAHUNAN)
- Durasi baru akan dihitung otomatis jika tanggal diubah
- Saldo baru akan dipotong sesuai durasi baru (jika jenis TAHUNAN)
- Jika tahun berubah, data akan dipindah ke cutiTahunan tahun yang sesuai
- Tahun ditentukan dari tanggalMulai

**Validation Rules:**
- Semua field optional, minimal satu field harus diisi
- `jenis`: Harus salah satu dari enum yang valid
- `alasan`: Minimal 1 karakter jika diisi
- `tanggalMulai` & `tanggalSelesai`: Format ISO 8601 datetime
- `tanggalSelesai` harus >= `tanggalMulai`

**Error Responses:**
- `400 Bad Request`: Validation error
- `404 Not Found`: Cuti tidak ditemukan

---

### GET /karyawan/:id
Get karyawan by ID

**Path Parameters:**
- `id` (required): UUID karyawan

**Example:**
```
GET /karyawan/550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data karyawan berhasil diambil",
  "data": {
    "id": "uuid",
    "nik": "123456789",
    "nama": "John Doe",
    "jabatan": "Software Engineer",
    "departemen": "IT",
    "tanggalMasuk": "2025-01-15T00:00:00.000Z",
    "status": "AKTIF",
    "createdAt": "2026-01-09T10:30:00.000Z",
    "updatedAt": "2026-01-09T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `404 Not Found`: Karyawan not found

---

### PUT /karyawan/:id
Update karyawan

**Path Parameters:**
- `id` (required): UUID karyawan

**Request Body (all fields optional):**
```json
{
  "nama": "Jane Doe",
  "jabatan": "Senior Software Engineer",
  "departemen": "IT",
  "tanggalMasuk": "2025-01-15T00:00:00.000Z",
  "status": "AKTIF" // "AKTIF" | "NONAKTIF"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data karyawan berhasil diupdate",
  "data": {
    "id": "uuid",
    "nik": "123456789",
    "nama": "Jane Doe",
    "jabatan": "Senior Software Engineer",
    "departemen": "IT",
    "tanggalMasuk": "2025-01-15T00:00:00.000Z",
    "status": "AKTIF",
    "createdAt": "2026-01-09T10:30:00.000Z",
    "updatedAt": "2026-01-09T10:35:00.000Z"
  }
}
```

**Validation Rules:**
- `nama` (optional): Minimal 1 karakter
- `status` (optional): "AKTIF" | "NONAKTIF"
- `tanggalMasuk` (optional): Valid ISO 8601 datetime string

**Error Responses:**
- `400 Bad Request`: Validation error
- `404 Not Found`: Karyawan not found

---

### DELETE /karyawan/:id
Deactivate karyawan (soft delete)

**Path Parameters:**
- `id` (required): UUID karyawan

**Example:**
```
DELETE /karyawan/550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
```json
{
  "success": true,
  "message": "Karyawan berhasil dinonaktifkan",
  "data": {
    "id": "uuid",
    "nik": "123456789",
    "nama": "John Doe",
    "status": "NONAKTIF",
    ...
  }
}
```

**Error Responses:**
- `404 Not Found`: Karyawan not found

---

## 3. Cuti Tahunan Endpoints

### POST /cuti-tahunan/generate
Generate hak cuti tahunan untuk karyawan

**Request Body:**
```json
{
  "tahun": 2026, // optional, default: tahun berjalan
  "karyawanId": "uuid" // optional, jika tidak ada akan generate untuk semua karyawan aktif
}
```

**Scenario 1: Generate untuk satu karyawan**
```json
{
  "tahun": 2026,
  "karyawanId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Cuti tahunan berhasil digenerate",
  "data": {
    "id": "uuid",
    "karyawanId": "uuid",
    "tahun": 2026,
    "jatahDasar": 12,
    "carryForward": 0,
    "totalHakCuti": 12,
    "cutiTerpakai": 0,
    "sisaCuti": 12,
    "tipe": "FULL",
    "createdAt": "2026-01-09T10:30:00.000Z"
  }
}
```

**Scenario 2: Generate bulk untuk semua karyawan aktif**
```json
{
  "tahun": 2026
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Cuti tahunan berhasil digenerate",
  "data": {
    "success": 10,
    "failed": 0,
    "results": [
      {
        "karyawanId": "uuid",
        "nama": "John Doe",
        "success": true,
        "data": {
          "id": "uuid",
          "jatahDasar": 12,
          "sisaCuti": 12,
          ...
        }
      }
    ]
  }
}
```

**Business Rules:**

Pemberian jatah cuti tahunan berdasarkan tahun kerja dan bulan masuk karyawan:

1. **Tahun 1 (Tahun pertama bekerja)**
   - Jatah: 0 hari
   - Tipe: PROBATION
   - Contoh: Masuk 6 Juni 2024 → Tahun 2024 dapat 0 hari

2. **Tahun 2 (Setelah 1 tahun bekerja)**
   - Jatah: 12 hari
   - Tipe: FULL
   - Contoh: Masuk 6 Juni 2024 → Tahun 2025 dapat 12 hari penuh

3. **Tahun 3+ (Setelah 2 tahun bekerja)**
   - Jatah: 12 - bulanMasuk + 1
   - Tipe: PRORATE
   - Contoh: Masuk 6 Juni 2024 → Tahun 2026 dapat 12 - 6 + 1 = 7 hari

**Fitur Khusus:**
- **Saldo Negatif Diperbolehkan**: Karyawan dapat menggunakan cuti sebelum mendapat jatah cuti tahunan. Saldo cuti (`sisaCuti`) bisa menjadi negatif.
- **Auto-adjustment saat Generate**: Ketika generate cuti tahunan, sistem akan otomatis menghitung cuti yang sudah terpakai dan menguranginya dari jatah. Contoh: Karyawan menggunakan 3 hari cuti sebelum generate, saat generate jatah 12 hari → sisaCuti = 12 - 3 = 9 hari.
- **Carry Forward**: Sisa cuti positif dari tahun sebelumnya akan dibawa ke tahun berikutnya (sesuai schema).

**Error Responses:**
- `400 Bad Request`: Validation error
- `404 Not Found`: Karyawan not found
- `409 Conflict`: Cuti tahunan sudah di-generate untuk tahun tersebut

---

### GET /cuti-tahunan
Get rekap cuti tahunan

**Query Parameters:**
- `tahun` (optional): Integer, filter by year
- `karyawanId` (optional): UUID, filter by karyawan

**Example:**
```
GET /cuti-tahunan?tahun=2026
GET /cuti-tahunan?karyawanId=uuid
GET /cuti-tahunan?tahun=2026&karyawanId=uuid
```

**Response (200):**
```json
{
  "success": true,
  "message": "Rekap cuti tahunan berhasil diambil",
  "data": [
    {
      "id": "uuid",
      "karyawanId": "uuid",
      "tahun": 2026,
      "jatahDasar": 12,
      "carryForward": 0,
      "totalHakCuti": 12,
      "cutiTerpakai": 3,
      "sisaCuti": 9,
      "tipe": "FULL",
      "createdAt": "2026-01-09T10:30:00.000Z",
      "karyawan": {
        "id": "uuid",
        "nik": "123456789",
        "nama": "John Doe",
        "jabatan": "Software Engineer",
        "tanggalMasuk": "2025-01-15T00:00:00.000Z"
      }
    }
  ]
}
```

---

### GET /cuti-tahunan/:id
Get detail cuti tahunan by ID

**Path Parameters:**
- `id` (required): UUID cuti tahunan

**Example:**
```
GET /cuti-tahunan/550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data cuti tahunan berhasil diambil",
  "data": {
    "id": "uuid",
    "karyawanId": "uuid",
    "tahun": 2026,
    "jatahDasar": 12,
    "carryForward": 0,
    "totalHakCuti": 12,
    "cutiTerpakai": 3,
    "sisaCuti": 9,
    "tipe": "FULL",
    "createdAt": "2026-01-09T10:30:00.000Z",
    "karyawan": {
      "id": "uuid",
      "nik": "123456789",
      "nama": "John Doe",
      "jabatan": "Software Engineer",
      "departemen": "IT",
      "tanggalMasuk": "2025-01-15T00:00:00.000Z",
      "status": "AKTIF"
    },
    "cuti": [
      {
        "id": "uuid",
        "jenis": "TAHUNAN",
        "alasan": "Liburan keluarga",
        "tanggalMulai": "2026-02-10T00:00:00.000Z",
        "tanggalSelesai": "2026-02-12T00:00:00.000Z",
        "jumlahHari": 3,
        "createdAt": "2026-01-09T10:30:00.000Z"
      }
    ]
  }
}
```

**Error Responses:**
- `404 Not Found`: Cuti tahunan not found

---

## 4. Cuti (Transaksi) Endpoints

### POST /cuti
Create/record cuti baru

**Request Body:**
```json
{
  "karyawanId": "uuid",
  "jenis": "TAHUNAN", // "TAHUNAN" | "SAKIT" | "IZIN" | "LAINNYA"
  "alasan": "Liburan keluarga",
  "tanggalMulai": "2026-02-10T00:00:00.000Z",
  "tanggalSelesai": "2026-02-12T00:00:00.000Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Cuti berhasil dicatat",
  "data": {
    "id": "uuid",
    "karyawanId": "uuid",
    "cutiTahunanId": "uuid",
    "tahun": 2026,
    "jenis": "TAHUNAN",
    "alasan": "Liburan keluarga",
    "tanggalMulai": "2026-02-10T00:00:00.000Z",
    "tanggalSelesai": "2026-02-12T00:00:00.000Z",
    "jumlahHari": 3,
    "createdAt": "2026-01-09T10:30:00.000Z"
  }
}
```

**Business Rules:**
- `jumlahHari` dihitung otomatis (working days: Senin-Jumat)
- Untuk jenis "TAHUNAN", sistem akan:
  - Validasi sisa cuti mencukupi
  - Otomatis mengurangi saldo cuti tahunan
  - Mencari atau membuat CutiTahunan untuk tahun tersebut

**Validation Rules:**
- `karyawanId` (required): Valid UUID
- `jenis` (required): "TAHUNAN" | "SAKIT" | "IZIN" | "LAINNYA"
- `alasan` (required): Minimal 1 karakter
- `tanggalMulai` (required): Valid ISO 8601 datetime
- `tanggalSelesai` (required): Valid ISO 8601 datetime, tidak boleh sebelum tanggalMulai

**Error Responses:**
- `400 Bad Request`: 
  - Validation error
  - Tanggal selesai sebelum tanggal mulai
  - Saldo cuti tidak mencukupi (untuk jenis TAHUNAN)
- `404 Not Found`: Karyawan not found

---

### GET /cuti
Get list cuti dengan filter dan pagination

**Query Parameters:**
- `karyawanId` (optional): UUID, filter by karyawan
- `jenis` (optional): "TAHUNAN" | "SAKIT" | "IZIN" | "LAINNYA"
- `tahun` (optional): Integer, filter by year
- `page` (optional): Integer, default: 1
- `limit` (optional): Integer, default: 20

**Example:**
```
GET /cuti?karyawanId=uuid&jenis=TAHUNAN&tahun=2026&page=1&limit=10
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data cuti berhasil diambil",
  "data": [
    {
      "id": "uuid",
      "karyawanId": "uuid",
      "cutiTahunanId": "uuid",
      "tahun": 2026,
      "jenis": "TAHUNAN",
      "alasan": "Liburan keluarga",
      "tanggalMulai": "2026-02-10T00:00:00.000Z",
      "tanggalSelesai": "2026-02-12T00:00:00.000Z",
      "jumlahHari": 3,
      "createdAt": "2026-01-09T10:30:00.000Z",
      "karyawan": {
        "id": "uuid",
        "nik": "123456789",
        "nama": "John Doe",
        "jabatan": "Software Engineer"
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

### GET /cuti/:id
Get cuti by ID

**Path Parameters:**
- `id` (required): UUID cuti

**Example:**
```
GET /cuti/550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data cuti berhasil diambil",
  "data": {
    "id": "uuid",
    "karyawanId": "uuid",
    "cutiTahunanId": "uuid",
    "tahun": 2026,
    "jenis": "TAHUNAN",
    "alasan": "Liburan keluarga",
    "tanggalMulai": "2026-02-10T00:00:00.000Z",
    "tanggalSelesai": "2026-02-12T00:00:00.000Z",
    "jumlahHari": 3,
    "createdAt": "2026-01-09T10:30:00.000Z",
    "karyawan": {
      "id": "uuid",
      "nik": "123456789",
      "nama": "John Doe",
      "jabatan": "Software Engineer",
      "departemen": "IT"
    },
    "cutiTahunan": {
      "id": "uuid",
      "tahun": 2026,
      "jatahDasar": 12,
      "sisaCuti": 9
    }
  }
}
```

**Error Responses:**
- `404 Not Found`: Cuti not found

---

### DELETE /cuti/:id
Delete/rollback cuti (mengembalikan saldo)

**Path Parameters:**
- `id` (required): UUID cuti

**Example:**
```
DELETE /cuti/550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
```json
{
  "success": true,
  "message": "Cuti berhasil dihapus dan saldo dikembalikan",
  "data": {
    "id": "uuid",
    "karyawanId": "uuid",
    "jenis": "TAHUNAN",
    "jumlahHari": 3,
    "sisaCutiSekarang": 12
  }
}
```

**Business Logic:**
- Untuk jenis "TAHUNAN", saldo akan dikembalikan otomatis

**Error Responses:**
- `404 Not Found`: Cuti not found

---

### GET /cuti/rekap/alasan
Get rekap alasan cuti (agregasi)

**Query Parameters:**
- `tahun` (optional): Integer, filter by year

**Example:**
```
GET /cuti/rekap/alasan?tahun=2026
```

**Response (200):**
```json
{
  "success": true,
  "message": "Rekap alasan cuti berhasil diambil",
  "data": [
    {
      "alasan": "Liburan keluarga",
      "count": 15,
      "totalHari": 45
    },
    {
      "alasan": "Sakit",
      "count": 8,
      "totalHari": 12
    },
    {
      "alasan": "Keperluan keluarga",
      "count": 5,
      "totalHari": 10
    }
  ]
}
```

---

### GET /cuti/summary/:karyawanId
Get summary cuti by karyawan

**Path Parameters:**
- `karyawanId` (required): UUID karyawan

**Query Parameters:**
- `tahun` (optional): Integer, filter by year

**Example:**
```
GET /cuti/summary/550e8400-e29b-41d4-a716-446655440000?tahun=2026
```

**Response (200):**
```json
{
  "success": true,
  "message": "Summary cuti berhasil diambil",
  "data": {
    "karyawan": {
      "id": "uuid",
      "nik": "123456789",
      "nama": "John Doe",
      "jabatan": "Software Engineer"
    },
    "tahun": 2026,
    "cutiTahunan": {
      "jatahDasar": 12,
      "totalHakCuti": 12,
      "cutiTerpakai": 3,
      "sisaCuti": 9
    },
    "byJenis": {
      "TAHUNAN": 3,
      "SAKIT": 2,
      "IZIN": 1,
      "LAINNYA": 0
    },
    "totalCuti": 6,
    "totalHari": 8
  }
}
```

**Error Responses:**
- `404 Not Found`: Karyawan not found

---

## Data Types & Enums

### StatusKaryawan
```typescript
enum StatusKaryawan {
  AKTIF = "AKTIF",
  NONAKTIF = "NONAKTIF"
}
```

### TipeCutiTahunan
```typescript
enum TipeCutiTahunan {
  PROBATION = "PROBATION",  // 0 hari
  PRORATE = "PRORATE",      // 7 hari
  FULL = "FULL"             // 12 hari
}
```

### JenisCuti
```typescript
enum JenisCuti {
  TAHUNAN = "TAHUNAN",   // Mengurangi saldo cuti tahunan
  SAKIT = "SAKIT",       // Tidak mengurangi saldo
  IZIN = "IZIN",         // Tidak mengurangi saldo
  BAKU = "BAKU",         // Tidak mengurangi saldo
  TANPA_KETERANGAN = "TANPA_KETERANGAN", // Tidak mengurangi saldo
  LAINNYA = "LAINNYA"    // Tidak mengurangi saldo
}
```

---

## Database Schema

### Karyawan
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| nik | String | Unique identifier |
| nama | String | Employee name |
| jabatan | String? | Job position (nullable) |
| departemen | String? | Department (nullable) |
| tanggalMasuk | DateTime | Join date |
| status | StatusKaryawan | AKTIF or NONAKTIF |
| createdAt | DateTime | Created timestamp |
| updatedAt | DateTime | Updated timestamp |

### CutiTahunan
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| karyawanId | UUID | Foreign key to Karyawan |
| tahun | Int | Year |
| jatahDasar | Int | Base entitlement (0/7/12) |
| carryForward | Int | Carried forward days |
| totalHakCuti | Int | Total entitlement |
| cutiTerpakai | Int | Used days |
| sisaCuti | Int | Remaining days |
| tipe | TipeCutiTahunan | PROBATION/PRORATE/FULL |
| createdAt | DateTime | Created timestamp |

**Unique Constraint:** (karyawanId, tahun)

### Cuti
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| karyawanId | UUID | Foreign key to Karyawan |
| cutiTahunanId | UUID | Foreign key to CutiTahunan |
| tahun | Int | Year |
| jenis | JenisCuti | TAHUNAN/SAKIT/IZIN/BAKU/TANPA_KETERANGAN/LAINNYA |
| alasan | String | Reason for leave |
| tanggalMulai | DateTime | Start date |
| tanggalSelesai | DateTime | End date |
| jumlahHari | Int | Number of working days |
| createdAt | DateTime | Created timestamp |

---

## Error Codes

| HTTP Status | Description |
|-------------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Validation error or business rule violation |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Duplicate resource (e.g., NIK exists, cuti tahunan already generated) |
| 500 | Internal Server Error - Unexpected server error |

---

## Notes

1. **Date Format**: All dates use ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`)
2. **UUID Format**: All IDs use UUID v4 format
3. **Working Days Calculation**: Senin-Jumat only (excluding weekends)
4. **Backward Compatibility**: Field `tanggal_bergabung` still accepted but `tanggalMasuk` is preferred
5. **Soft Delete**: DELETE /karyawan/:id performs soft delete (status → NONAKTIF)
6. **Auto-deduction**: Creating cuti with jenis "TAHUNAN" automatically deducts from saldo
7. **Rollback Support**: Deleting cuti with jenis "TAHUNAN" automatically restores saldo

---

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
PORT=3000
NODE_ENV=development
```

---

## 5. Absensi Endpoints

### POST /absensi/upload-fingerprint
Upload file Excel dari mesin fingerprint untuk proses absensi masuk

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (required): File Excel (.xls atau .xlsx)
  - `tanggal` (required): Tanggal absensi (ISO 8601 format)

**Excel Format:**
- Column A: No. ID (Fingerprint ID)
- Column B: NIK
- Column C: Nama
- Column D: Waktu
- Column E: Status

**Response:**
```json
{
  "success": true,
  "message": "Upload fingerprint berhasil diproses",
  "data": {
    "success": 45,
    "failed": 0,
    "notFound": 2,
    "duplicate": 3,
    "details": {
      "processed": ["Budi Santoso", "Ani Wijaya", "..."],
      "notMatched": [
        {
          "id": 123,
          "nik": "12345",
          "nama": "Nama Karyawan",
          "waktu": "1/14/2026 7:46 AM",
          "status": "Masuk"
        }
      ],
      "duplicates": ["Ahmad", "Siti"]
    }
  }
}
```

**Status Codes:**
- `200 OK` - Upload berhasil diproses
- `400 Bad Request` - File tidak valid atau format salah
- `422 Unprocessable Entity` - Validasi gagal

---

### GET /absensi/belum-absen
Get daftar karyawan aktif yang belum absen pada tanggal tertentu

**Query Parameters:**
- `tanggal` (required): Tanggal yang akan dicek (ISO 8601 format)

**Response:**
```json
{
  "success": true,
  "message": "Data karyawan belum absen berhasil diambil",
  "data": {
    "karyawan": [
      {
        "id": "uuid",
        "nik": "12345",
        "nama": "Budi Santoso",
        "jabatan": "Staff IT",
        "departemen": "Technology",
        "fingerprintId": 101
      }
    ],
    "total": 5
  }
}
```

**Status Codes:**
- `200 OK` - Berhasil
- `400 Bad Request` - Parameter tanggal tidak valid

---

### POST /absensi/manual
Buat absensi manual untuk karyawan (sakit, izin, WFH, tanpa keterangan)

**Request Body:**
```json
{
  "karyawanId": "uuid",
  "tanggal": "2026-01-15T00:00:00.000Z",
  "statusKehadiran": "SAKIT",
  "keterangan": "Demam tinggi",
  "diinputOleh": "Admin HR"
}
```

**Fields:**
- `karyawanId` (required): UUID karyawan
- `tanggal` (required): Tanggal absensi (ISO 8601 format)
- `statusKehadiran` (required): Enum: `SAKIT`, `IZIN`, `WFH`, `TANPA_KETERANGAN`
- `keterangan` (optional): Alasan/keterangan
- `diinputOleh` (optional): Nama yang menginput

**Response:**
```json
{
  "success": true,
  "message": "Absensi manual berhasil dibuat",
  "data": {
    "id": "uuid",
    "karyawanId": "uuid",
    "tanggal": "2026-01-15T00:00:00.000Z",
    "statusKehadiran": "SAKIT",
    "isManual": true,
    "keterangan": "Demam tinggi",
    "diinputOleh": "Admin HR",
    "karyawan": {
      "id": "uuid",
      "nik": "12345",
      "nama": "Budi Santoso",
      "jabatan": "Staff IT",
      "departemen": "Technology"
    },
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

**Status Codes:**
- `201 Created` - Absensi berhasil dibuat
- `400 Bad Request` - Validasi gagal atau karyawan tidak aktif
- `404 Not Found` - Karyawan tidak ditemukan
- `409 Conflict` - Absensi untuk tanggal ini sudah ada
- `422 Unprocessable Entity` - Validasi gagal

---

### GET /absensi
Get semua data absensi dengan berbagai filter

**Query Parameters:**
- `tanggalMulai` (optional): Filter dari tanggal (ISO 8601 format)
- `tanggalSelesai` (optional): Filter sampai tanggal (ISO 8601 format)
- `karyawanId` (optional): Filter berdasarkan karyawan
- `statusKehadiran` (optional): Filter berdasarkan status (`HADIR`, `SAKIT`, `IZIN`, `WFH`, `TANPA_KETERANGAN`)
- `isManual` (optional): Filter manual/fingerprint (`true` atau `false`)
- `page` (optional, default: 1): Halaman
- `limit` (optional, default: 50): Jumlah data per halaman

**Response:**
```json
{
  "success": true,
  "message": "Data absensi berhasil diambil",
  "data": [
    {
      "id": "uuid",
      "karyawanId": "uuid",
      "tanggal": "2026-01-15T00:00:00.000Z",
      "statusKehadiran": "HADIR",
      "isManual": false,
      "keterangan": null,
      "diinputOleh": null,
      "karyawan": {
        "id": "uuid",
        "nik": "12345",
        "nama": "Budi Santoso",
        "jabatan": "Staff IT",
        "departemen": "Technology"
      },
      "createdAt": "2026-01-15T07:46:00.000Z",
      "updatedAt": "2026-01-15T07:46:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

**Status Codes:**
- `200 OK` - Berhasil
- `422 Unprocessable Entity` - Validasi parameter gagal

---

### GET /absensi/:id
Get detail absensi berdasarkan ID

**Response:**
```json
{
  "success": true,
  "message": "Data absensi berhasil diambil",
  "data": {
    "id": "uuid",
    "karyawanId": "uuid",
    "tanggal": "2026-01-15T00:00:00.000Z",
    "statusKehadiran": "SAKIT",
    "isManual": true,
    "keterangan": "Demam tinggi",
    "diinputOleh": "Admin HR",
    "karyawan": {
      "id": "uuid",
      "nik": "12345",
      "nama": "Budi Santoso",
      "jabatan": "Staff IT",
      "departemen": "Technology"
    },
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

**Status Codes:**
- `200 OK` - Berhasil
- `404 Not Found` - Absensi tidak ditemukan

---

### PUT /absensi/:id
Update absensi (hanya untuk absensi manual)

**Request Body:**
```json
{
  "statusKehadiran": "IZIN",
  "keterangan": "Keperluan keluarga",
  "diinputOleh": "Admin HR"
}
```

**Fields (semua optional):**
- `statusKehadiran`: Enum: `HADIR`, `SAKIT`, `IZIN`, `WFH`, `TANPA_KETERANGAN`
- `keterangan`: Alasan/keterangan
- `diinputOleh`: Nama yang menginput

**Response:**
```json
{
  "success": true,
  "message": "Absensi berhasil diupdate",
  "data": {
    "id": "uuid",
    "karyawanId": "uuid",
    "tanggal": "2026-01-15T00:00:00.000Z",
    "statusKehadiran": "IZIN",
    "isManual": true,
    "keterangan": "Keperluan keluarga",
    "diinputOleh": "Admin HR",
    "karyawan": {
      "id": "uuid",
      "nik": "12345",
      "nama": "Budi Santoso",
      "jabatan": "Staff IT",
      "departemen": "Technology"
    },
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T11:00:00.000Z"
  }
}
```

**Status Codes:**
- `200 OK` - Berhasil diupdate
- `400 Bad Request` - Tidak bisa update absensi dari fingerprint (isManual=false)
- `404 Not Found` - Absensi tidak ditemukan
- `422 Unprocessable Entity` - Validasi gagal

---

### DELETE /absensi/:id
Hapus data absensi

**Response:**
```json
{
  "success": true,
  "message": "Absensi berhasil dihapus",
  "data": null
}
```

**Status Codes:**
- `200 OK` - Berhasil dihapus
- `404 Not Found` - Absensi tidak ditemukan

---

### GET /absensi/ringkasan
Get ringkasan absensi untuk periode tertentu

**Query Parameters:**
- `tanggalMulai` (required): Tanggal mulai periode (ISO 8601 format)
- `tanggalSelesai` (required): Tanggal akhir periode (ISO 8601 format)
- `karyawanId` (optional): Filter untuk karyawan tertentu

**Response:**
```json
{
  "success": true,
  "message": "Ringkasan absensi berhasil diambil",
  "data": {
    "HADIR": 220,
    "SAKIT": 5,
    "IZIN": 3,
    "WFH": 12,
    "TANPA_KETERANGAN": 2
  }
}
```

**Status Codes:**
- `200 OK` - Berhasil
- `400 Bad Request` - Parameter tanggal tidak lengkap

---

**Last Updated:** January 15, 2026  
**API Version:** 1.1.0
