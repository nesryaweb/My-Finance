-- DropForeignKey
ALTER TABLE "CategoryGroup" DROP CONSTRAINT "CategoryGroup_userId_fkey";

-- CreateIndex
CREATE INDEX "Budget_userId_idx" ON "Budget"("userId");

-- CreateIndex
CREATE INDEX "CategoryGroup_userId_idx" ON "CategoryGroup"("userId");

-- AddForeignKey
ALTER TABLE "CategoryGroup" ADD CONSTRAINT "CategoryGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
