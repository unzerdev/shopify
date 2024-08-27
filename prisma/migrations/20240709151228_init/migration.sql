-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "unzerPublicKey" TEXT NOT NULL,
    "unzerPrivateKey" TEXT NOT NULL,
    "paymentPage" TEXT,
    "ready" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL,
    "gid" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "test" BOOLEAN NOT NULL,
    "currency" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "cancelUrl" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT,
    "processingData" TEXT,

    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundSession" (
    "id" TEXT NOT NULL,
    "gid" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT,

    CONSTRAINT "RefundSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureSession" (
    "id" TEXT NOT NULL,
    "gid" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT,
    "processingData" TEXT,

    CONSTRAINT "CaptureSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoidSession" (
    "id" TEXT NOT NULL,
    "gid" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT,

    CONSTRAINT "VoidSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_sessionId_key" ON "Configuration"("sessionId");

-- CreateIndex
CREATE INDEX "Configuration_sessionId_idx" ON "Configuration"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "VoidSession_paymentId_key" ON "VoidSession"("paymentId");

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundSession" ADD CONSTRAINT "RefundSession_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureSession" ADD CONSTRAINT "CaptureSession_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoidSession" ADD CONSTRAINT "VoidSession_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
