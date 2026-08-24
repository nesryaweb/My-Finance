/*
  Warnings:

  - A unique constraint covering the columns `[debtReceivedId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "debtReceivedId" TEXT;

-- CreateTable
CREATE TABLE "DebtReceived" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "debtId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebtReceived_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_debtReceivedId_key" ON "Transaction"("debtReceivedId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_debtReceivedId_fkey" FOREIGN KEY ("debtReceivedId") REFERENCES "DebtReceived"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtReceived" ADD CONSTRAINT "DebtReceived_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtReceived" ADD CONSTRAINT "DebtReceived_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
