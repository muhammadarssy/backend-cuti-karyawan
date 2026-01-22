/*
  Warnings:

  - The values [SATPAM] on the enum `StatusKehadiran` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "TipeDiscount" AS ENUM ('BONUS', 'PERSEN');

-- AlterEnum
BEGIN;
CREATE TYPE "StatusKehadiran_new" AS ENUM ('HADIR', 'SAKIT', 'IZIN', 'WFH', 'TANPA_KETERANGAN', 'CUTI', 'CUTI_BAKU', 'SECURITY', 'TUGAS', 'BELUM_FINGERPRINT');
ALTER TABLE "public"."Absensi" ALTER COLUMN "statusKehadiran" DROP DEFAULT;
ALTER TABLE "Absensi" ALTER COLUMN "statusKehadiran" TYPE "StatusKehadiran_new" USING ("statusKehadiran"::text::"StatusKehadiran_new");
ALTER TYPE "StatusKehadiran" RENAME TO "StatusKehadiran_old";
ALTER TYPE "StatusKehadiran_new" RENAME TO "StatusKehadiran";
DROP TYPE "public"."StatusKehadiran_old";
ALTER TABLE "Absensi" ALTER COLUMN "statusKehadiran" SET DEFAULT 'HADIR';
COMMIT;

-- AlterTable
ALTER TABLE "Cuti" ALTER COLUMN "alasan" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "totalBudget" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabelStruk" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "warna" TEXT,
    "isAktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabelStruk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Struk" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "nomorStruk" TEXT,
    "fileBukti" TEXT,
    "namaFileAsli" TEXT,
    "totalHarga" INTEGER NOT NULL,
    "totalDiscount" INTEGER NOT NULL DEFAULT 0,
    "taxPersen" DECIMAL(65,30),
    "taxNominal" INTEGER,
    "totalSetelahTax" INTEGER NOT NULL,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Struk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrukItem" (
    "id" TEXT NOT NULL,
    "strukId" TEXT NOT NULL,
    "labelStrukId" TEXT NOT NULL,
    "namaItem" TEXT NOT NULL,
    "itemId" TEXT,
    "harga" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discountType" "TipeDiscount",
    "discountValue" INTEGER,
    "discountNominal" INTEGER NOT NULL DEFAULT 0,
    "totalSetelahDiscount" INTEGER NOT NULL,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrukItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Budget_tahun_bulan_idx" ON "Budget"("tahun", "bulan");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_bulan_tahun_key" ON "Budget"("bulan", "tahun");

-- CreateIndex
CREATE UNIQUE INDEX "LabelStruk_nama_key" ON "LabelStruk"("nama");

-- CreateIndex
CREATE INDEX "LabelStruk_isAktif_idx" ON "LabelStruk"("isAktif");

-- CreateIndex
CREATE UNIQUE INDEX "Struk_nomorStruk_key" ON "Struk"("nomorStruk");

-- CreateIndex
CREATE INDEX "Struk_budgetId_idx" ON "Struk"("budgetId");

-- CreateIndex
CREATE INDEX "Struk_tanggal_idx" ON "Struk"("tanggal");

-- CreateIndex
CREATE INDEX "Struk_nomorStruk_idx" ON "Struk"("nomorStruk");

-- CreateIndex
CREATE INDEX "StrukItem_strukId_idx" ON "StrukItem"("strukId");

-- CreateIndex
CREATE INDEX "StrukItem_labelStrukId_idx" ON "StrukItem"("labelStrukId");

-- CreateIndex
CREATE INDEX "StrukItem_itemId_idx" ON "StrukItem"("itemId");

-- AddForeignKey
ALTER TABLE "Struk" ADD CONSTRAINT "Struk_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrukItem" ADD CONSTRAINT "StrukItem_strukId_fkey" FOREIGN KEY ("strukId") REFERENCES "Struk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrukItem" ADD CONSTRAINT "StrukItem_labelStrukId_fkey" FOREIGN KEY ("labelStrukId") REFERENCES "LabelStruk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrukItem" ADD CONSTRAINT "StrukItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
