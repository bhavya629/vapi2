CREATE TYPE "ProductImageType" AS ENUM ('FRONT', 'BACK', 'SIDE', 'ANGLE', 'OTHER');

DROP INDEX "InventoryReservation_orderId_productId_key";

ALTER TABLE "InventoryMovement" ADD COLUMN "variantColourId" TEXT;
ALTER TABLE "InventoryReservation" ADD COLUMN "variantColourId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "colourName" TEXT,
ADD COLUMN "productVariantColourId" TEXT,
ADD COLUMN "productVariantId" TEXT,
ADD COLUMN "ram" TEXT,
ADD COLUMN "storage" TEXT,
ADD COLUMN "variantSku" TEXT;

CREATE TABLE "ProductVariant" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "ram" TEXT NOT NULL,
  "storage" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductColour" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "hexCode" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductColour_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductVariantColour" (
  "id" TEXT NOT NULL,
  "productVariantId" TEXT NOT NULL,
  "productColourId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "originalPrice" DECIMAL(10,2),
  "stock" INTEGER NOT NULL DEFAULT 0,
  "reservedStock" INTEGER NOT NULL DEFAULT 0,
  "lowStockThreshold" INTEGER NOT NULL DEFAULT 3,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariantColour_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductVariantImage" (
  "id" TEXT NOT NULL,
  "productVariantColourId" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "altText" TEXT,
  "imageType" "ProductImageType" NOT NULL DEFAULT 'OTHER',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariantImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductVariant_productId_isActive_displayOrder_idx" ON "ProductVariant"("productId", "isActive", "displayOrder");
CREATE UNIQUE INDEX "ProductVariant_productId_ram_storage_key" ON "ProductVariant"("productId", "ram", "storage");
CREATE UNIQUE INDEX "ProductVariant_one_default_per_product" ON "ProductVariant"("productId") WHERE "isDefault" = true;
CREATE INDEX "ProductColour_productId_isActive_displayOrder_idx" ON "ProductColour"("productId", "isActive", "displayOrder");
CREATE UNIQUE INDEX "ProductColour_productId_slug_key" ON "ProductColour"("productId", "slug");
CREATE UNIQUE INDEX "ProductColour_productId_name_key" ON "ProductColour"("productId", "name");
CREATE UNIQUE INDEX "ProductColour_one_default_per_product" ON "ProductColour"("productId") WHERE "isDefault" = true;
CREATE UNIQUE INDEX "ProductVariantColour_sku_key" ON "ProductVariantColour"("sku");
CREATE INDEX "ProductVariantColour_productVariantId_isActive_displayOrder_idx" ON "ProductVariantColour"("productVariantId", "isActive", "displayOrder");
CREATE INDEX "ProductVariantColour_productColourId_isActive_idx" ON "ProductVariantColour"("productColourId", "isActive");
CREATE INDEX "ProductVariantColour_stock_reservedStock_idx" ON "ProductVariantColour"("stock", "reservedStock");
CREATE UNIQUE INDEX "ProductVariantColour_productVariantId_productColourId_key" ON "ProductVariantColour"("productVariantId", "productColourId");
CREATE UNIQUE INDEX "ProductVariantColour_one_default_per_variant" ON "ProductVariantColour"("productVariantId") WHERE "isDefault" = true;
CREATE INDEX "ProductVariantImage_productVariantColourId_displayOrder_idx" ON "ProductVariantImage"("productVariantColourId", "displayOrder");
CREATE UNIQUE INDEX "ProductVariantImage_one_primary_per_combination" ON "ProductVariantImage"("productVariantColourId") WHERE "isPrimary" = true;
CREATE INDEX "InventoryMovement_variantColourId_createdAt_idx" ON "InventoryMovement"("variantColourId", "createdAt");
CREATE INDEX "InventoryReservation_orderId_variantColourId_idx" ON "InventoryReservation"("orderId", "variantColourId");
CREATE INDEX "InventoryReservation_variantColourId_status_idx" ON "InventoryReservation"("variantColourId", "status");
CREATE INDEX "OrderItem_productVariantId_idx" ON "OrderItem"("productVariantId");
CREATE INDEX "OrderItem_productVariantColourId_idx" ON "OrderItem"("productVariantColourId");

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductColour" ADD CONSTRAINT "ProductColour_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductVariantColour" ADD CONSTRAINT "ProductVariantColour_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductVariantColour" ADD CONSTRAINT "ProductVariantColour_productColourId_fkey" FOREIGN KEY ("productColourId") REFERENCES "ProductColour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductVariantImage" ADD CONSTRAINT "ProductVariantImage_productVariantColourId_fkey" FOREIGN KEY ("productVariantColourId") REFERENCES "ProductVariantColour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_variantColourId_fkey" FOREIGN KEY ("variantColourId") REFERENCES "ProductVariantColour"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_variantColourId_fkey" FOREIGN KEY ("variantColourId") REFERENCES "ProductVariantColour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productVariantColourId_fkey" FOREIGN KEY ("productVariantColourId") REFERENCES "ProductVariantColour"("id") ON DELETE SET NULL ON UPDATE CASCADE;
