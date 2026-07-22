-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "inventoryRestoredAt" TIMESTAMP(3),
ADD COLUMN     "outForDeliveryAt" TIMESTAMP(3),
ADD COLUMN     "packedAt" TIMESTAMP(3),
ADD COLUMN     "readyForPickupAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderStatusHistory" ADD COLUMN     "isCustomerVisible" BOOLEAN NOT NULL DEFAULT true;
