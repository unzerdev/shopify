-- AlterTable
ALTER TABLE "UnzerCancel" ADD COLUMN     "voidId" TEXT;

-- AddForeignKey
ALTER TABLE "UnzerCancel" ADD CONSTRAINT "UnzerCancel_voidId_fkey" FOREIGN KEY ("voidId") REFERENCES "VoidSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
