/*
  Warnings:

  - Added the required column `checkoutCartToken` to the `PaymentSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PaymentSession" ADD COLUMN     "checkoutCartToken" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Checkout" (
    "id" TEXT NOT NULL,
    "cartToken" TEXT NOT NULL,
    "lines" TEXT NOT NULL,
    "customer" TEXT NOT NULL,

    CONSTRAINT "Checkout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_cartToken_key" ON "Checkout"("cartToken");
