/*
  Warnings:

  - Made the column `cancelId` on table `UnzerCancel` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "UnzerCancel" ADD COLUMN     "refundId" TEXT,
ALTER COLUMN "cancelId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "UnzerCancel" ADD CONSTRAINT "UnzerCancel_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "RefundSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
