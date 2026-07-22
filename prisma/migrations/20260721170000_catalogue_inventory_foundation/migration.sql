-- Catalogue and inventory foundation.
-- This migration preserves any legacy Product rows by deriving Brand/Category
-- records before the old string columns are removed.

CREATE TYPE "InventoryReason" AS ENUM (
  'INITIAL_STOCK', 'ADMIN_ADJUSTMENT', 'RESTOCK', 'ORDER_DEDUCTION',
  'ORDER_CANCELLATION', 'RETURN', 'CORRECTION'
);

CREATE TABLE "Brand" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "logoUrl" TEXT,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "productType" "ProductType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Product"
  ADD COLUMN "brandId" TEXT,
  ADD COLUMN "categoryId" TEXT,
  ADD COLUMN "compatibility" JSONB,
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "legacyId" INTEGER,
  ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "originalPrice" DECIMAL(10,2),
  ADD COLUMN "rating" DECIMAL(2,1),
  ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "shortDescription" TEXT,
  ADD COLUMN "sku" TEXT,
  ADD COLUMN "specifications" JSONB;

-- Backfill relations for any pre-existing products without assuming an empty table.
INSERT INTO "Brand" ("id", "name", "slug", "updatedAt")
SELECT 'legacy-brand-' || md5("brand"), "brand", 'legacy-brand-' || md5("brand"), CURRENT_TIMESTAMP
FROM "Product"
GROUP BY "brand";

INSERT INTO "Category" ("id", "name", "slug", "productType", "updatedAt")
SELECT 'legacy-category-' || md5("category" || ':' || "productType"::text),
       "category",
       'legacy-category-' || md5("category" || ':' || "productType"::text),
       "productType",
       CURRENT_TIMESTAMP
FROM "Product"
GROUP BY "category", "productType";

UPDATE "Product"
SET "brandId" = 'legacy-brand-' || md5("brand"),
    "categoryId" = 'legacy-category-' || md5("category" || ':' || "productType"::text);

ALTER TABLE "Product"
  ALTER COLUMN "brandId" SET NOT NULL,
  ALTER COLUMN "categoryId" SET NOT NULL,
  DROP COLUMN "brand",
  DROP COLUMN "category";

CREATE TABLE "ProductImage" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "altText" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantityChange" INTEGER NOT NULL,
  "previousStock" INTEGER NOT NULL,
  "newStock" INTEGER NOT NULL,
  "reason" "InventoryReason" NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryMovement_stock_nonnegative" CHECK ("previousStock" >= 0 AND "newStock" >= 0)
);

CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");
CREATE INDEX "Brand_isActive_displayOrder_idx" ON "Brand"("isActive", "displayOrder");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_productType_isActive_displayOrder_idx" ON "Category"("productType", "isActive", "displayOrder");
CREATE INDEX "ProductImage_productId_displayOrder_idx" ON "ProductImage"("productId", "displayOrder");
CREATE INDEX "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId", "createdAt");
CREATE INDEX "InventoryMovement_referenceType_referenceId_idx" ON "InventoryMovement"("referenceType", "referenceId");
CREATE UNIQUE INDEX "Product_legacyId_key" ON "Product"("legacyId");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_productType_idx" ON "Product"("productType");
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");
CREATE INDEX "Product_isFeatured_idx" ON "Product"("isFeatured");
CREATE INDEX "Product_displayOrder_idx" ON "Product"("displayOrder");
CREATE INDEX "Product_price_idx" ON "Product"("price");
CREATE INDEX "Product_productType_isActive_displayOrder_idx" ON "Product"("productType", "isActive", "displayOrder");

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_price_nonnegative" CHECK ("price" >= 0),
  ADD CONSTRAINT "Product_original_price_nonnegative" CHECK ("originalPrice" IS NULL OR "originalPrice" >= 0),
  ADD CONSTRAINT "Product_stock_nonnegative" CHECK ("stock" >= 0),
  ADD CONSTRAINT "Product_low_stock_threshold_nonnegative" CHECK ("lowStockThreshold" >= 0),
  ADD CONSTRAINT "Product_review_count_nonnegative" CHECK ("reviewCount" >= 0),
  ADD CONSTRAINT "Product_rating_range" CHECK ("rating" IS NULL OR ("rating" >= 0 AND "rating" <= 5));

ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
