-- Smartphone and accessory routes each historically used their own numeric ID
-- sequence, so compatibility IDs are unique within product type, not globally.
DROP INDEX "Product_legacyId_key";
CREATE UNIQUE INDEX "Product_productType_legacyId_key" ON "Product"("productType", "legacyId");
