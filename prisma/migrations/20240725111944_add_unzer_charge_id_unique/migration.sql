/*
  Warnings:

  - The primary key for the `UnzerCharge` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `UnzerCharge` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `chargeId` to the `UnzerCharge` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "UnzerCharge_id_key";

-- AlterTable
ALTER TABLE "UnzerCharge" DROP CONSTRAINT "UnzerCharge_pkey",
ADD COLUMN     "chargeId" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "UnzerCharge_pkey" PRIMARY KEY ("id");
