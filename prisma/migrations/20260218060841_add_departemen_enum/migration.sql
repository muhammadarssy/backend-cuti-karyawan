/*
  Warnings:

  - The `departemen` column on the `Karyawan` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Departemen" AS ENUM ('SECURITY', 'STAFF');

-- AlterTable
ALTER TABLE "Karyawan" DROP COLUMN "departemen",
ADD COLUMN     "departemen" "Departemen";
