-- AlterTable
ALTER TABLE "ExpenseCategory" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "KeywordMapping" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KeywordMapping_keyword_idx" ON "KeywordMapping"("keyword");

-- AddForeignKey
ALTER TABLE "KeywordMapping" ADD CONSTRAINT "KeywordMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
