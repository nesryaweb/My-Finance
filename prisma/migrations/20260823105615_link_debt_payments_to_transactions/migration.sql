/*
  Warnings:

  - A unique constraint covering the columns `[debtPaymentId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "debtPaymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_debtPaymentId_key" ON "Transaction"("debtPaymentId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_debtPaymentId_fkey" FOREIGN KEY ("debtPaymentId") REFERENCES "DebtPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
