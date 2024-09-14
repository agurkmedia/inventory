/*
  Warnings:

  - A unique constraint covering the columns `[receiptId,itemId,categoryId,date]` on the table `ReceiptItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `date` to the `ReceiptItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ReceiptItem" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptItem_receiptId_itemId_categoryId_date_key" ON "ReceiptItem"("receiptId", "itemId", "categoryId", "date");
