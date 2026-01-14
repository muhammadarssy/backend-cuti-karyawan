-- CreateEnum
CREATE TYPE "KategoriItem" AS ENUM ('ATK', 'OBAT');

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" "KategoriItem" NOT NULL,
    "satuan" TEXT NOT NULL,
    "stokMinimal" INTEGER NOT NULL DEFAULT 0,
    "stokSekarang" INTEGER NOT NULL DEFAULT 0,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pembelian" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "supplier" TEXT,
    "hargaSatuan" INTEGER NOT NULL,
    "totalHarga" INTEGER NOT NULL,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pembelian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengeluaran" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "keperluan" TEXT NOT NULL,
    "penerima" TEXT,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pengeluaran_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_kode_key" ON "Item"("kode");

-- CreateIndex
CREATE INDEX "Item_kategori_idx" ON "Item"("kategori");

-- CreateIndex
CREATE INDEX "Item_kode_idx" ON "Item"("kode");

-- CreateIndex
CREATE INDEX "Pembelian_itemId_idx" ON "Pembelian"("itemId");

-- CreateIndex
CREATE INDEX "Pembelian_tanggal_idx" ON "Pembelian"("tanggal");

-- CreateIndex
CREATE INDEX "Pengeluaran_itemId_idx" ON "Pengeluaran"("itemId");

-- CreateIndex
CREATE INDEX "Pengeluaran_tanggal_idx" ON "Pengeluaran"("tanggal");

-- AddForeignKey
ALTER TABLE "Pembelian" ADD CONSTRAINT "Pembelian_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengeluaran" ADD CONSTRAINT "Pengeluaran_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
