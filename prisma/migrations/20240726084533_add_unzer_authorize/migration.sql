-- CreateTable
CREATE TABLE "UnzerAuthorize" (
    "id" SERIAL NOT NULL,
    "chargeId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "isSuccess" BOOLEAN NOT NULL,
    "isPending" BOOLEAN NOT NULL,
    "isResumed" BOOLEAN NOT NULL,
    "isError" BOOLEAN NOT NULL,
    "card3ds" BOOLEAN NOT NULL,
    "redirectUrl" TEXT,
    "message" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "resources" TEXT,
    "invoiceId" TEXT,
    "paymentReference" TEXT,
    "processing" TEXT,

    CONSTRAINT "UnzerAuthorize_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UnzerAuthorize" ADD CONSTRAINT "UnzerAuthorize_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
