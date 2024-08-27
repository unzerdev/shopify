-- CreateTable
CREATE TABLE "UnzerCharge" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "isSuccess" BOOLEAN NOT NULL,
    "isPending" BOOLEAN NOT NULL,
    "isResumed" BOOLEAN NOT NULL,
    "isError" BOOLEAN NOT NULL,
    "card3ds" BOOLEAN NOT NULL,
    "redirectUrl" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "resources" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "processing" TEXT NOT NULL,

    CONSTRAINT "UnzerCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnzerCharge_id_key" ON "UnzerCharge"("id");

-- AddForeignKey
ALTER TABLE "UnzerCharge" ADD CONSTRAINT "UnzerCharge_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
