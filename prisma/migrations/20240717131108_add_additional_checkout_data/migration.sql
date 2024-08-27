/*
  Warnings:

  - You are about to drop the column `cartToken` on the `Checkout` table. All the data in the column will be lost.
  - Added the required column `currency` to the `Checkout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotalPrice` to the `Checkout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalDuties` to the `Checkout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalLineItemsPrice` to the `Checkout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPrice` to the `Checkout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalTax` to the `Checkout` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Checkout_cartToken_key";

-- AlterTable
ALTER TABLE "Checkout" DROP COLUMN "cartToken",
ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "subtotalPrice" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "totalDuties" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "totalLineItemsPrice" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "totalPrice" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "totalTax" DECIMAL(65,30) NOT NULL;
