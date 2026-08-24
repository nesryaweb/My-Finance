-- CreateTable
CREATE TABLE "DebtReceipt" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "debtId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebtReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebtReceipt_debtId_idx" ON "DebtReceipt"("debtId");

-- CreateIndex
CREATE INDEX "DebtReceipt_accountId_idx" ON "DebtReceipt"("accountId");

-- AddForeignKey
ALTER TABLE "DebtReceipt" ADD CONSTRAINT "DebtReceipt_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtReceipt" ADD CONSTRAINT "DebtReceipt_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
