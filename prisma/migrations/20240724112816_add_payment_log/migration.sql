-- CreateEnum
CREATE TYPE "LogMessageType" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateTable
CREATE TABLE "PaymentLog" (
    "id" SERIAL NOT NULL,
    "paymentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "LogMessageType" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,

    CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
