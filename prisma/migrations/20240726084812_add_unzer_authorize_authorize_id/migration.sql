/*
  Warnings:

  - You are about to drop the column `chargeId` on the `UnzerAuthorize` table. All the data in the column will be lost.
  - Added the required column `authorizeId` to the `UnzerAuthorize` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UnzerAuthorize" DROP COLUMN "chargeId",
ADD COLUMN     "authorizeId" TEXT NOT NULL;
