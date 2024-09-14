/*
  Warnings:

  - A unique constraint covering the columns `[userId,storeName,totalAmount,date]` on the table `Receipt` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Receipt_userId_storeName_totalAmount_date_key" ON "Receipt"("userId", "storeName", "totalAmount", "date");
