-- CreateEnum
CREATE TYPE "StatusKaryawan" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "TipeCutiTahunan" AS ENUM ('PROBATION', 'PRORATE', 'FULL');

-- CreateEnum
CREATE TYPE "JenisCuti" AS ENUM ('TAHUNAN', 'SAKIT', 'IZIN', 'LAINNYA');

-- CreateTable
CREATE TABLE "Karyawan" (
    "id" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT,
    "departemen" TEXT,
    "tanggalMasuk" TIMESTAMP(3) NOT NULL,
    "status" "StatusKaryawan" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CutiTahunan" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jatahDasar" INTEGER NOT NULL,
    "carryForward" INTEGER NOT NULL DEFAULT 0,
    "totalHakCuti" INTEGER NOT NULL,
    "cutiTerpakai" INTEGER NOT NULL DEFAULT 0,
    "sisaCuti" INTEGER NOT NULL,
    "tipe" "TipeCutiTahunan" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CutiTahunan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuti" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "cutiTahunanId" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jenis" "JenisCuti" NOT NULL,
    "alasan" TEXT NOT NULL,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3) NOT NULL,
    "jumlahHari" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cuti_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Karyawan_nik_key" ON "Karyawan"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "CutiTahunan_karyawanId_tahun_key" ON "CutiTahunan"("karyawanId", "tahun");

-- AddForeignKey
ALTER TABLE "CutiTahunan" ADD CONSTRAINT "CutiTahunan_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "Karyawan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuti" ADD CONSTRAINT "Cuti_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "Karyawan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuti" ADD CONSTRAINT "Cuti_cutiTahunanId_fkey" FOREIGN KEY ("cutiTahunanId") REFERENCES "CutiTahunan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
