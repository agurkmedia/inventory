-- CreateTable
CREATE TABLE "ItemScraping" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "image" BYTEA,
    "inventoryId" TEXT NOT NULL,
    "productCode" TEXT,
    "price" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "availability" TEXT,
    "manufacturer" TEXT,
    "attenuation" TEXT,
    "flocculation" TEXT,
    "usageDirections" TEXT,
    "storageRecommendations" TEXT,
    "desinfisering" TEXT,
    "contactTime" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemScraping_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ItemScraping" ADD CONSTRAINT "ItemScraping_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
