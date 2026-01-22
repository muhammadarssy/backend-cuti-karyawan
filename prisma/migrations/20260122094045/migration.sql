/*
  Warnings:

  - Added the required column `kategoriBudgetId` to the `StrukItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StrukItem" ADD COLUMN     "kategoriBudgetId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "KategoriBudget" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "isAktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KategoriBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetKategori" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "kategoriBudgetId" TEXT NOT NULL,
    "alokasi" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetKategori_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KategoriBudget_nama_key" ON "KategoriBudget"("nama");

-- CreateIndex
CREATE INDEX "KategoriBudget_isAktif_idx" ON "KategoriBudget"("isAktif");

-- CreateIndex
CREATE INDEX "BudgetKategori_budgetId_idx" ON "BudgetKategori"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetKategori_kategoriBudgetId_idx" ON "BudgetKategori"("kategoriBudgetId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetKategori_budgetId_kategoriBudgetId_key" ON "BudgetKategori"("budgetId", "kategoriBudgetId");

-- CreateIndex
CREATE INDEX "StrukItem_kategoriBudgetId_idx" ON "StrukItem"("kategoriBudgetId");

-- AddForeignKey
ALTER TABLE "BudgetKategori" ADD CONSTRAINT "BudgetKategori_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetKategori" ADD CONSTRAINT "BudgetKategori_kategoriBudgetId_fkey" FOREIGN KEY ("kategoriBudgetId") REFERENCES "KategoriBudget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrukItem" ADD CONSTRAINT "StrukItem_kategoriBudgetId_fkey" FOREIGN KEY ("kategoriBudgetId") REFERENCES "KategoriBudget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
