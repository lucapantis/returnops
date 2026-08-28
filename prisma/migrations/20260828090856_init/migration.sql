-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Return" (
    "id" TEXT NOT NULL,
    "returnRef" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "operatorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Return_returnRef_key" ON "Return"("returnRef");

-- CreateIndex
CREATE INDEX "Return_status_idx" ON "Return"("status");

-- CreateIndex
CREATE INDEX "Return_reason_idx" ON "Return"("reason");

-- CreateIndex
CREATE INDEX "Return_receivedDate_idx" ON "Return"("receivedDate");

-- CreateIndex
CREATE INDEX "Return_orderNumber_idx" ON "Return"("orderNumber");
