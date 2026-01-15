/*
  Warnings:

  - A unique constraint covering the columns `[fingerprintId]` on the table `Karyawan` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StatusKehadiran" AS ENUM ('HADIR', 'SAKIT', 'IZIN', 'WFH', 'TANPA_KETERANGAN');

-- AlterTable
ALTER TABLE "Karyawan" ADD COLUMN     "fingerprintId" INTEGER;

-- CreateTable
CREATE TABLE "Absensi" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "statusKehadiran" "StatusKehadiran" NOT NULL DEFAULT 'HADIR',
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "keterangan" TEXT,
    "diinputOleh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Absensi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Absensi_tanggal_idx" ON "Absensi"("tanggal");

-- CreateIndex
CREATE INDEX "Absensi_statusKehadiran_idx" ON "Absensi"("statusKehadiran");

-- CreateIndex
CREATE UNIQUE INDEX "Absensi_karyawanId_tanggal_key" ON "Absensi"("karyawanId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "Karyawan_fingerprintId_key" ON "Karyawan"("fingerprintId");

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "Karyawan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
