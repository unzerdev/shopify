/*
  Warnings:

  - Added the required column `chargeId` to the `UnzerCancel` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UnzerCancelStatus" AS ENUM ('PENDING', 'RESOLVED');

-- AlterTable
ALTER TABLE "UnzerCancel" ADD COLUMN     "chargeId" TEXT NOT NULL,
ADD COLUMN     "status" "UnzerCancelStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "cancelId" DROP NOT NULL,
ALTER COLUMN "isSuccess" DROP NOT NULL,
ALTER COLUMN "isPending" DROP NOT NULL,
ALTER COLUMN "isResumed" DROP NOT NULL,
ALTER COLUMN "isError" DROP NOT NULL,
ALTER COLUMN "card3ds" DROP NOT NULL,
ALTER COLUMN "amount" DROP NOT NULL,
ALTER COLUMN "currency" DROP NOT NULL,
ALTER COLUMN "date" DROP NOT NULL;
