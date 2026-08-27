-- CreateTable
CREATE TABLE "Return" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnRef" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "receivedDate" DATETIME NOT NULL,
    "completedDate" DATETIME,
    "operatorNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
