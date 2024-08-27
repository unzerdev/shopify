/*
  Warnings:

  - You are about to drop the column `paymentPage` on the `Configuration` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Configuration" DROP COLUMN "paymentPage",
ADD COLUMN     "paymentPageSettings" TEXT;
