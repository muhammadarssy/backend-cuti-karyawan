# API Specification - Absensi Management

## Base URL
```
http://localhost:3000/api/absensi
```

## Overview
API untuk mengelola absensi karyawan dengan dua metode input:
1. **Upload Fingerprint** - Import data dari mesin fingerprint (Excel)
2. **Input Manual** - Entry manual untuk kasus sakit, izin, WFH, atau tanpa keterangan

---

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
    "limit": 50,
    "total": 250,
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

## Endpoints

## 1. Upload Fingerprint

### POST /upload-fingerprint
Upload file Excel dari mesin fingerprint untuk membuat record absensi masuk secara otomatis.

**Request:**
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (required): File Excel (.xls atau .xlsx)
  - `tanggal` (required): Tanggal absensi dalam format ISO 8601

**Excel Format (dari Mesin Fingerprint):**
| Column | Field | Description |
|--------|-------|-------------|
| A | No. ID | Fingerprint ID (Integer) |
| B | NIK | NIK Karyawan |
| C | Nama | Nama Karyawan |
| D | Waktu | Waktu scan (e.g., "1/14/2026 7:46 AM") - **Akan disimpan sebagai jam masuk** |
| E | Status | Status dari mesin (e.g., "Masuk") |
| F | Status baru | - |
| G | Pengecualian | - |
| H | Operasi | - |

> **Note:** Field `Waktu` (kolom D) akan di-parse dan disimpan ke database sebagai jam masuk karyawan.

**Contoh Request dengan cURL:**
```bash
curl -X POST http://localhost:3000/api/absensi/upload-fingerprint \
  -H "Content-Type: multipart/form-data" \
  -F "file=@fingerprint_14_jan_2026.xlsx" \
  -F "tanggal=2026-01-14T00:00:00.000Z"
```

**Response Success (200 OK):**
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
      "processed": [
        "Budi Santoso",
        "Ani Wijaya",
        "Citra Dewi",
        "..."
      ],
      "notMatched": [
        {
          "id": 123,
          "nik": "12345",
          "nama": "John Doe",
          "waktu": "1/14/2026 7:46 AM",
          "status": "Masuk"
        }
      ],
      "duplicates": [
        "Ahmad Fajar",
        "Siti Nurhaliza"
      ]
    }
  },
  "meta": {
    "timestamp": "2026-01-15T02:30:00.000Z"
  }
}
```

**Response Fields:**
- `success`: Jumlah absensi yang berhasil dibuat
- `failed`: Jumlah yang gagal diproses karena error
- `notFound`: Jumlah fingerprint ID yang tidak cocok dengan karyawan
- `duplicate`: Jumlah karyawan yang sudah absen di tanggal yang sama
- `details.processed`: Array nama karyawan yang berhasil diproses
- `details.notMatched`: Array data fingerprint yang tidak cocok dengan karyawan
- `details.duplicates`: Array nama karyawan yang sudah ada absensinya

**Error Responses:**

**400 Bad Request** - File tidak valid
```json
{
  "success": false,
  "message": "File Excel wajib diupload"
}
```

**400 Bad Request** - Format Excel salah
```json
{
  "success": false,
  "message": "Gagal membaca file Excel. Pastikan format file benar"
}
```

**422 Unprocessable Entity** - Validasi gagal
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "path": ["tanggal"],
        "message": "Format tanggal tidak valid"
      }
    ]
  }
}
```

---

## 2. Get Karyawan Belum Absen

### GET /belum-absen
Mendapatkan daftar karyawan aktif yang belum memiliki record absensi pada tanggal tertentu. Berguna untuk identifikasi siapa yang perlu di-input manual.

**Request:**
- **Method:** `GET`
- **Query Parameters:**
  - `tanggal` (required): Tanggal yang akan dicek (ISO 8601 format)

**Contoh Request:**
```bash
curl -X GET "http://localhost:3000/api/absensi/belum-absen?tanggal=2026-01-14T00:00:00.000Z"
```

**Response Success (200 OK):**
```json
{
  "success": true,
  "message": "Data karyawan belum absen berhasil diambil",
  "data": {
    "karyawan": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "nik": "12345",
        "nama": "Budi Santoso",
        "jabatan": "Staff IT",
        "departemen": "Technology",
        "fingerprintId": 101
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "nik": "12346",
        "nama": "Ani Wijaya",
        "jabatan": "Manager HR",
        "departemen": "Human Resources",
        "fingerprintId": null
      }
    ],
    "total": 2
  },
  "meta": {
    "timestamp": "2026-01-15T02:30:00.000Z"
  }
}
```

**Response Fields:**
- `karyawan`: Array karyawan yang belum absen (status AKTIF)
- `total`: Jumlah total karyawan yang belum absen
- `fingerprintId`: ID fingerprint (null jika belum di-set)

**Error Responses:**

**400 Bad Request** - Tanggal tidak valid
```json
{
  "success": false,
  "message": "Parameter tanggal wajib diisi"
}
```

**400 Bad Request** - Format tanggal salah
```json
{
  "success": false,
  "message": "Format tanggal tidak valid"
}
```

---

## 3. Create Absensi Manual

### POST /manual
Membuat record absensi secara manual untuk karyawan yang sakit, izin, WFH, atau tanpa keterangan.

**Request:**
- **Method:** `POST`
- **Content-Type:** `application/json`
- **Body:**

```json
{
  "karyawanId": "550e8400-e29b-41d4-a716-446655440001",
  "tanggal": "2026-01-14T00:00:00.000Z",
  "statusKehadiran": "SAKIT",
  "keterangan": "Demam tinggi dan flu",
  "diinputOleh": "Admin HR"
}
```

**Request Fields:**
- `karyawanId` (required): UUID karyawan
- `tanggal` (required): Tanggal absensi (ISO 8601 format)
- `statusKehadiran` (required): Status kehadiran
  - Valid values: `SAKIT`, `IZIN`, `WFH`, `TANPA_KETERANGAN`, `CUTI`, `CUTI_BAKU`, `SECURITY`, `TUGAS`, `BELUM_FINGERPRINT`
  - Note: `HADIR` tidak bisa di-input manual, hanya dari fingerprint
- `keterangan` (optional): Alasan atau keterangan tambahan
- `diinputOleh` (optional): Nama user yang menginput

**Contoh Request:**
```bash
curl -X POST http://localhost:3000/api/absensi/manual \
  -H "Content-Type: application/json" \
  -d '{
    "karyawanId": "550e8400-e29b-41d4-a716-446655440001",
    "tanggal": "2026-01-14T00:00:00.000Z",
    "statusKehadiran": "SAKIT",
    "keterangan": "Demam tinggi",
    "diinputOleh": "Admin HR"
  }'
```

**Response Success (201 Created):**
```json
{
  "success": true,
  "message": "Absensi manual berhasil dibuat",
  "data": {
    "id": "650e8400-e29b-41d4-a716-446655440003",
    "karyawanId": "550e8400-e29b-41d4-a716-446655440001",
    "tanggal": "2026-01-14T00:00:00.000Z",
    "statusKehadiran": "SAKIT",
    "isManual": true,
    "keterangan": "Demam tinggi",
    "diinputOleh": "Admin HR",
    "karyawan": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "nik": "12345",
      "nama": "Budi Santoso",
      "jabatan": "Staff IT",
      "departemen": "Technology"
    },
    "createdAt": "2026-01-15T02:30:00.000Z",
    "updatedAt": "2026-01-15T02:30:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-15T02:30:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - Karyawan tidak aktif
```json
{
  "success": false,
  "message": "Karyawan tidak aktif"
}
```

**404 Not Found** - Karyawan tidak ditemukan
```json
{
  "success": false,
  "message": "Karyawan tidak ditemukan"
}
```

**409 Conflict** - Duplikasi absensi
```json
{
  "success": false,
  "message": "Absensi untuk tanggal ini sudah ada"
}
```

**422 Unprocessable Entity** - Validasi gagal
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "path": ["statusKehadiran"],
        "message": "Status kehadiran tidak valid"
      }
    ]
  }
}
```

---

## 4. Bulk Create Absensi Manual

### POST /bulk-manual
Membuat multiple record absensi manual sekaligus untuk beberapa karyawan dengan status yang sama. Berguna untuk input massal setelah upload fingerprint.

**Request:**
- **Method:** `POST`
- **Content-Type:** `application/json`
- **Body:**

```json
{
  "karyawanIds": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002",
    "550e8400-e29b-41d4-a716-446655440003"
  ],
  "tanggal": "2026-01-14T00:00:00.000Z",
  "statusKehadiran": "SAKIT",
  "keterangan": "Flu season - mass sick leave",
  "diinputOleh": "Admin HR"
}
```

**Request Fields:**
- `karyawanIds` (required): Array of UUID karyawan (minimal 1)
- `tanggal` (required): Tanggal absensi (ISO 8601 format)
- `statusKehadiran` (required): Status kehadiran yang sama untuk semua
  - Valid values: `SAKIT`, `IZIN`, `WFH`, `TANPA_KETERANGAN`, `CUTI`, `CUTI_BAKU`, `SECURITY`, `TUGAS`, `BELUM_FINGERPRINT`
- `keterangan` (optional): Keterangan yang sama untuk semua
- `diinputOleh` (optional): Nama user yang menginput

**Contoh Request:**
```bash
curl -X POST http://localhost:3000/api/absensi/bulk-manual \
  -H "Content-Type: application/json" \
  -d '{
    "karyawanIds": [
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    ],
    "tanggal": "2026-01-14T00:00:00.000Z",
    "statusKehadiran": "WFH",
    "keterangan": "Remote work day",
    "diinputOleh": "Manager IT"
  }'
```

**Response Success (201 Created):**
```json
{
  "success": true,
  "message": "Bulk absensi manual berhasil diproses",
  "data": {
    "success": 2,
    "failed": 0,
    "duplicate": 1,
    "details": {
      "created": [
        "Budi Santoso",
        "Ani Wijaya"
      ],
      "duplicates": [
        "Citra Dewi"
      ],
      "failed": []
    }
  },
  "meta": {
    "timestamp": "2026-01-15T02:30:00.000Z"
  }
}
```

**Response Fields:**
- `success`: Jumlah absensi yang berhasil dibuat
- `failed`: Jumlah yang gagal (karyawan tidak ditemukan/tidak aktif atau error lain)
- `duplicate`: Jumlah yang sudah ada absensi di tanggal tersebut
- `details.created`: Array nama karyawan yang berhasil dibuat
- `details.duplicates`: Array nama karyawan yang sudah ada absensinya
- `details.failed`: Array karyawan yang gagal dengan detail error

**Error Responses:**

**422 Unprocessable Entity** - Validasi gagal
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "path": ["karyawanIds"],
        "message": "Minimal satu karyawan harus dipilih"
      }
    ]
  }
}
```

---

## 5. Get All Absensi (dengan Filter)

### GET /
Mendapatkan daftar absensi dengan berbagai filter dan pagination.

**Request:**
- **Method:** `GET`
- **Query Parameters:**
  - `tanggalMulai` (optional): Filter dari tanggal (ISO 8601)
  - `tanggalSelesai` (optional): Filter sampai tanggal (ISO 8601)
  - `karyawanId` (optional): Filter berdasarkan UUID karyawan
  - `statusKehadiran` (optional): Filter berdasarkan status
    - Valid values: `HADIR`, `SAKIT`, `IZIN`, `WFH`, `TANPA_KETERANGAN`
  - `isManual` (optional): Filter manual/fingerprint (`true` atau `false`)
  - `page` (optional, default: 1): Nomor halaman
  - `limit` (optional, default: 50): Jumlah data per halaman

**Contoh Request:**
```bash
# Get semua absensi bulan Januari 2026
curl -X GET "http://localhost:3000/api/absensi?tanggalMulai=2026-01-01T00:00:00.000Z&tanggalSelesai=2026-01-31T23:59:59.999Z"

# Get absensi karyawan tertentu
curl -X GET "http://localhost:3000/api/absensi?karyawanId=550e8400-e29b-41d4-a716-446655440001"

# Get hanya absensi manual (sakit/izin/WFH)
curl -X GET "http://localhost:3000/api/absensi?isManual=true"

# Get absensi SAKIT dengan pagination
curl -X GET "http://localhost:3000/api/absensi?statusKehadiran=SAKIT&page=1&limit=20"
```

**Response Success (200 OK):**
```json
{
  "success": true,
  "message": "Data absensi berhasil diambil",
  "data": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440003",
      "karyawanId": "550e8400-e29b-41d4-a716-446655440001",
      "tanggal": "2026-01-14T00:00:00.000Z",
      "statusKehadiran": "HADIR",
      "isManual": false,
      "keterangan": null,
      "diinputOleh": null,
      "karyawan": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "nik": "12345",
        "nama": "Budi Santoso",
        "jabatan": "Staff IT",
        "departemen": "Technology"
      },
      "createdAt": "2026-01-14T07:46:00.000Z",
      "updatedAt": "2026-01-14T07:46:00.000Z"
    },
    {
      "id": "650e8400-e29b-41d4-a716-446655440004",
      "karyawanId": "550e8400-e29b-41d4-a716-446655440002",
      "tanggal": "2026-01-14T00:00:00.000Z",
      "statusKehadiran": "SAKIT",
      "isManual": true,
      "keterangan": "Flu dan demam",
      "diinputOleh": "Admin HR",
      "karyawan": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "nik": "12346",
        "nama": "Ani Wijaya",
        "jabatan": "Manager HR",
        "departemen": "Human Resources"
      },
      "createdAt": "2026-01-14T09:15:00.000Z",
      "updatedAt": "2026-01-14T09:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  },
  "meta": {
    "timestamp": "2026-01-15T02:30:00.000Z"
  }
}
```

**Error Responses:**

**422 Unprocessable Entity** - Validasi parameter gagal
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "path": ["statusKehadiran"],
        "message": "Status kehadiran tidak valid"
      }
    ]
  }
}
```

---

## 5. Get Absensi by ID

### GET /:id
Mendapatkan detail absensi berdasarkan ID.

**Request:**
- **Method:** `GET`
- **Path Parameter:**
  - `id` (required): UUID absensi

**Contoh Request:**
```bash
curl -X GET http://localhost:3000/api/absensi/650e8400-e29b-41d4-a716-446655440003
```

**Response Success (200 OK):**
```json
{
  "success": true,
  "message": "Data absensi berhasil diambil",
  "data": {
    "id": "650e8400-e29b-41d4-a716-446655440003",
    "karyawanId": "550e8400-e29b-41d4-a716-446655440001",
    "tanggal": "2026-01-14T00:00:00.000Z",
    "statusKehadiran": "SAKIT",
    "isManual": true,
    "keterangan": "Demam tinggi dan flu",
    "diinputOleh": "Admin HR",
    "karyawan": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "nik": "12345",
      "nama": "Budi Santoso",
      "jabatan": "Staff IT",
      "departemen": "Technology"
    },
    "createdAt": "2026-01-14T09:15:00.000Z",
    "updatedAt": "2026-01-14T09:15:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-15T02:30:00.000Z"
  }
}
```

**Error Responses:**

**404 Not Found** - Absensi tidak ditemukan
```json
{
  "success": false,
  "message": "Absensi tidak ditemukan"
}
```

---

## 6. Update Absensi

### PUT /:id
Update data absensi yang di-input manual. **Catatan:** Absensi dari fingerprint (isManual=false) tidak bisa diupdate.

**Request:**
- **Method:** `PUT`
- **Path Parameter:**
  - `id` (required): UUID absensi
- **Content-Type:** `application/json`
- **Body:**

```json
{
  "statusKehadiran": "IZIN",
  "keterangan": "Keperluan keluarga mendadak",
  "diinputOleh": "Admin HR"
}
```

**Request Fields (semua optional):**
- `statusKehadiran`: Enum: `HADIR`, `SAKIT`, `IZIN`, `WFH`, `TANPA_KETERANGAN`, `CUTI`, `CUTI_BAKU`, `SECURITY`, `TUGAS`, `BELUM_FINGERPRINT`
- `keterangan`: Update keterangan
- `diinputOleh`: Update nama yang menginput

**Contoh Request:**
```bash
curl -X PUT http://localhost:3000/api/absensi/650e8400-e29b-41d4-a716-446655440003 \
  -H "Content-Type: application/json" \
  -d '{
    "statusKehadiran": "IZIN",
    "keterangan": "Keperluan keluarga",
    "diinputOleh": "Admin HR"
  }'
```

**Response Success (200 OK):**
```json
{
  "success": true,
  "message": "Absensi berhasil diupdate",
  "data": {
    "id": "650e8400-e29b-41d4-a716-446655440003",
    "karyawanId": "550e8400-e29b-41d4-a716-446655440001",
    "tanggal": "2026-01-14T00:00:00.000Z",
    "statusKehadiran": "IZIN",
    "isManual": true,
    "keterangan": "Keperluan keluarga",
    "diinputOleh": "Admin HR",
    "karyawan": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "nik": "12345",
      "nama": "Budi Santoso",
      "jabatan": "Staff IT",
      "departemen": "Technology"
    },
    "createdAt": "2026-01-14T09:15:00.000Z",
    "updatedAt": "2026-01-15T02:45:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-15T02:45:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - Tidak bisa update absensi fingerprint
```json
{
  "success": false,
  "message": "Hanya absensi manual yang bisa diubah"
}
```

**404 Not Found** - Absensi tidak ditemukan
```json
{
  "success": false,
  "message": "Absensi tidak ditemukan"
}
```

**422 Unprocessable Entity** - Validasi gagal
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "path": ["statusKehadiran"],
        "message": "Status kehadiran tidak valid"
      }
    ]
  }
}
```

---

## 7. Delete Absensi

### DELETE /:id
Menghapus record absensi. Bisa digunakan untuk absensi fingerprint maupun manual.

**Request:**
- **Method:** `DELETE`
- **Path Parameter:**
  - `id` (required): UUID absensi

**Contoh Request:**
```bash
curl -X DELETE http://localhost:3000/api/absensi/650e8400-e29b-41d4-a716-446655440003
```

**Response Success (200 OK):**
```json
{
  "success": true,
  "message": "Absensi berhasil dihapus",
  "meta": {
    "timestamp": "2026-01-15T02:50:00.000Z"
  }
}
```

**Error Responses:**

**404 Not Found** - Absensi tidak ditemukan
```json
{
  "success": false,
  "message": "Absensi tidak ditemukan"
}
```

---

## 8. Get Ringkasan Absensi

### GET /ringkasan
Mendapatkan statistik/ringkasan absensi berdasarkan status kehadiran untuk periode tertentu.

**Request:**
- **Method:** `GET`
- **Query Parameters:**
  - `tanggalMulai` (required): Tanggal mulai periode (ISO 8601)
  - `tanggalSelesai` (required): Tanggal akhir periode (ISO 8601)
  - `karyawanId` (optional): Filter untuk karyawan tertentu

**Contoh Request:**
```bash
# Ringkasan semua karyawan bulan Januari 2026
curl -X GET "http://localhost:3000/api/absensi/ringkasan?tanggalMulai=2026-01-01T00:00:00.000Z&tanggalSelesai=2026-01-31T23:59:59.999Z"

# Ringkasan karyawan tertentu
curl -X GET "http://localhost:3000/api/absensi/ringkasan?tanggalMulai=2026-01-01T00:00:00.000Z&tanggalSelesai=2026-01-31T23:59:59.999Z&karyawanId=550e8400-e29b-41d4-a716-446655440001"
```

**Response Success (200 OK):**
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
  },
  "meta": {
    "timestamp": "2026-01-15T02:55:00.000Z"
  }
}
```

**Response Fields:**
- Object dengan key berupa status kehadiran dan value berupa jumlah
- Status yang tidak ada record tidak akan muncul di response

**Error Responses:**

**400 Bad Request** - Parameter tidak lengkap
```json
{
  "success": false,
  "message": "Parameter tanggalMulai dan tanggalSelesai wajib diisi"
}
```

---

## 9. Export Absensi to Excel

### GET /export
Export data absensi ke file Excel untuk semua karyawan aktif dalam periode tertentu. File akan menampilkan semua karyawan aktif dengan data absensi mereka (jika ada) untuk setiap hari dalam periode.

**Request:**
- **Method:** `GET`
- **Query Parameters:**
  - `tanggalMulai` (required): Tanggal mulai periode (ISO 8601)
  - `tanggalSelesai` (required): Tanggal akhir periode (ISO 8601)

**Contoh Request:**
```bash
# Export absensi bulan Januari 2026
curl -X GET "http://localhost:3000/api/absensi/export?tanggalMulai=2026-01-01T00:00:00.000Z&tanggalSelesai=2026-01-31T23:59:59.999Z" \
  --output absensi.xlsx
```

**Response Success (200 OK):**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="Absensi_[tanggalMulai]_[tanggalSelesai].xlsx"`
- Body: Binary Excel file

**Format Excel:**
| Column | Description |
|--------|-------------|
| Tanggal | Tanggal absensi (YYYY-MM-DD) |
| NIK | NIK karyawan |
| Nama | Nama karyawan |
| Jam Masuk | Jam masuk (HH:mm), "-" jika tidak ada |
| Status | Status kehadiran (HADIR/SAKIT/IZIN/WFH/dll), "-" jika tidak ada |
| Sumber | "Fingerprint" atau "Manual", "-" jika tidak ada |
| Keterangan | Keterangan tambahan, "-" jika tidak ada |
| Remark | "TELAT" jika jam masuk > 08:15 dan status HADIR |

**Karakteristik Export:**
- Menampilkan **semua karyawan aktif** (tidak hanya yang ada absensinya)
- Untuk setiap karyawan, generate 1 row per hari dalam periode
- Jika karyawan tidak ada absensi di suatu hari, kolom akan diisi "-"
- Remark "TELAT" hanya muncul jika:
  - Ada jam masuk
  - Status kehadiran = HADIR
  - Jam masuk > 08:15

**Error Responses:**

**400 Bad Request** - Parameter tidak lengkap
```json
{
  "success": false,
  "message": "Parameter tanggalMulai dan tanggalSelesai wajib diisi"
}
```

---

## Data Models

### Absensi Object
```typescript
{
  id: string;                    // UUID
  karyawanId: string;            // UUID karyawan
  tanggal: string;               // ISO 8601 date
  jam: string | null;            // ISO 8601 datetime (waktu masuk dari fingerprint)
  statusKehadiran: string;       // HADIR | SAKIT | IZIN | WFH | TANPA_KETERANGAN | CUTI | CUTI_BAKU | SECURITY | TUGAS | BELUM_FINGERPRINT
  isManual: boolean;             // false = dari fingerprint, true = input manual
  keterangan: string | null;     // Alasan (untuk manual)
  diinputOleh: string | null;    // Nama yang input (untuk manual)
  karyawan: {                    // Include detail karyawan
    id: string;
    nik: string;
    nama: string;
    jabatan: string | null;
    departemen: string | null;
  };
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}
```

### Status Kehadiran Enum
- `HADIR` - Karyawan hadir (hanya dari fingerprint)
- `SAKIT` - Karyawan sakit (manual input)
- `IZIN` - Karyawan izin (manual input)
- `WFH` - Work From Home (manual input)
- `TANPA_KETERANGAN` - Tidak hadir tanpa keterangan (manual input)
- `CUTI` - Karyawan cuti (manual input)
- `CUTI_BAKU` - Karyawan cuti baku (manual input)
- `SECURITY` - Security/Satpam (manual input)
- `TUGAS` - Karyawan sedang tugas (manual input)
- `BELUM_FINGERPRINT` - Belum fingerprint (manual input)

---

## Business Rules

### Upload Fingerprint
1. File harus berformat Excel (.xls atau .xlsx)
2. Maksimal ukuran file: 5MB
3. Sistem akan matching `fingerprintId` (kolom A) dengan field `fingerprintId` di tabel Karyawan
4. Hanya karyawan dengan status `AKTIF` yang akan diproses
5. Duplikasi otomatis di-skip (jika karyawan sudah absen di tanggal yang sama)
6. Record yang tidak match akan masuk ke `notMatched` array

### Absensi Manual
1. Hanya bisa untuk status: `SAKIT`, `IZIN`, `WFH`, `TANPA_KETERANGAN`, `CUTI`, `CUTI_BAKU`, `SECURITY`, `TUGAS`, `BELUM_FINGERPRINT`
2. Status `HADIR` hanya bisa dibuat dari upload fingerprint
3. Karyawan harus berstatus `AKTIF`
4. Tidak boleh duplikasi tanggal untuk karyawan yang sama
5. Field `keterangan` dan `diinputOleh` bersifat optional tapi direkomendasikan

### Update Absensi
1. Hanya absensi manual (`isManual=true`) yang bisa diupdate
2. Absensi dari fingerprint (`isManual=false`) tidak bisa diubah
3. Untuk mengubah absensi fingerprint, harus dihapus dulu lalu buat manual

### Delete Absensi
1. Bisa delete absensi manual maupun fingerprint
2. Delete bersifat permanent (hard delete)
3. Tidak ada soft delete atau archive

### Unique Constraint
- Satu karyawan hanya boleh punya **1 record absensi per tanggal**
- Database akan enforce constraint `@@unique([karyawanId, tanggal])`

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Input validasi gagal |
| `BAD_REQUEST` | 400 | Request tidak valid |
| `NOT_FOUND` | 404 | Resource tidak ditemukan |
| `CONFLICT` | 409 | Duplikasi data |
| `BUSINESS_LOGIC_ERROR` | 422 | Business rule violation |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## Example Use Cases

### Use Case 1: Upload Absensi Harian
**Scenario:** Setiap pagi, HR mendownload data fingerprint kemarin dan upload ke sistem.

```bash
# 1. Upload file fingerprint
curl -X POST http://localhost:3000/api/absensi/upload-fingerprint \
  -F "file=@fingerprint_14jan2026.xlsx" \
  -F "tanggal=2026-01-14T00:00:00.000Z"

# Response: 45 berhasil, 2 tidak match, 3 duplikat

# 2. Cek siapa yang belum absen
curl -X GET "http://localhost:3000/api/absensi/belum-absen?tanggal=2026-01-14T00:00:00.000Z"

# Response: 5 karyawan belum absen

# 3. Input manual untuk yang sakit/izin
curl -X POST http://localhost:3000/api/absensi/manual \
  -H "Content-Type: application/json" \
  -d '{
    "karyawanId": "uuid-karyawan-1",
    "tanggal": "2026-01-14T00:00:00.000Z",
    "statusKehadiran": "SAKIT",
    "keterangan": "Flu",
    "diinputOleh": "Admin HR"
  }'
```

### Use Case 2: Monitoring Absensi Bulanan
**Scenario:** Manager ingin lihat absensi tim bulan ini.

```bash
# 1. Get semua absensi tim bulan Januari
curl -X GET "http://localhost:3000/api/absensi?tanggalMulai=2026-01-01T00:00:00.000Z&tanggalSelesai=2026-01-31T23:59:59.999Z"

# 2. Get ringkasan statistik
curl -X GET "http://localhost:3000/api/absensi/ringkasan?tanggalMulai=2026-01-01T00:00:00.000Z&tanggalSelesai=2026-01-31T23:59:59.999Z"

# Response: HADIR: 220, SAKIT: 5, IZIN: 3, WFH: 12

# 3. Get detail karyawan yang sering sakit
curl -X GET "http://localhost:3000/api/absensi?statusKehadiran=SAKIT&tanggalMulai=2026-01-01T00:00:00.000Z"
```

### Use Case 3: Koreksi Data Absensi
**Scenario:** Admin perlu mengubah absensi yang salah input.

```bash
# 1. Cari absensi yang perlu dikoreksi
curl -X GET "http://localhost:3000/api/absensi?karyawanId=uuid-karyawan-1&tanggalMulai=2026-01-14T00:00:00.000Z&tanggalSelesai=2026-01-14T23:59:59.999Z"

# 2. Update status dari SAKIT ke IZIN
curl -X PUT http://localhost:3000/api/absensi/uuid-absensi \
  -H "Content-Type: application/json" \
  -d '{
    "statusKehadiran": "IZIN",
    "keterangan": "Izin keperluan keluarga",
    "diinputOleh": "Admin HR - Koreksi"
  }'
```

---

## Notes

### Integrasi dengan Karyawan
- Field `fingerprintId` di tabel Karyawan perlu diisi untuk matching otomatis
- Karyawan tanpa `fingerprintId` tidak akan ter-match saat upload fingerprint
- Karyawan tanpa `fingerprintId` tetap bisa dibuatkan absensi manual

### Time Handling
- Semua tanggal di-normalize ke awal hari (00:00:00)
- Tidak ada tracking jam masuk/pulang, hanya kehadiran per hari
- Timezone menggunakan server timezone (perlu disesuaikan jika diperlukan)

### Performance
- Upload fingerprint di-process dalam 1 transaksi untuk konsistensi
- Bulk insert menggunakan `createMany` untuk performa optimal
- Index pada field `tanggal`, `statusKehadiran` untuk query cepat

### Security
- Belum ada autentikasi/authorization (perlu ditambahkan di production)
- File upload dibatasi 5MB untuk mencegah abuse
- Validasi file type untuk accept hanya Excel

---

**Last Updated:** January 15, 2026  
**API Version:** 1.1.0  
**Maintained by:** Backend Team
