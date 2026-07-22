CREATE TABLE "ProductVariantSpecification" (
  "id" TEXT NOT NULL,
  "productVariantColourId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariantSpecification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductVariantSpecification_productVariantColourId_key_key"
ON "ProductVariantSpecification"("productVariantColourId", "key");

CREATE INDEX "ProductVariantSpecification_productVariantColourId_idx"
ON "ProductVariantSpecification"("productVariantColourId");

ALTER TABLE "ProductVariantSpecification"
ADD CONSTRAINT "ProductVariantSpecification_productVariantColourId_fkey"
FOREIGN KEY ("productVariantColourId") REFERENCES "ProductVariantColour"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
