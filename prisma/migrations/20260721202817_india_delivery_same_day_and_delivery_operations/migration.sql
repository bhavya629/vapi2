-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('SAME_DAY_LOCAL', 'OUTSTATION_CONFIRMATION', 'OUTSTATION_STANDARD', 'STORE_PICKUP');

-- CreateEnum
CREATE TYPE "DeliveryZone" AS ENUM ('WITHIN_50_KM', 'BEYOND_50_KM', 'NEEDS_VERIFICATION', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ShippingChargeStatus" AS ENUM ('FIXED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'REJECTED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('AWAITING_ASSIGNMENT', 'AWAITING_DISTANCE_VERIFICATION', 'AWAITING_SHIPPING_CONFIRMATION', 'SHIPPING_CONFIRMED', 'PACKAGING_PENDING', 'PACKED', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'SHIPPED', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShippingConfirmationMethod" AS ENUM ('PHONE_CALL', 'WHATSAPP', 'SMS', 'EMAIL', 'IN_PERSON', 'OTHER');

-- CreateEnum
CREATE TYPE "SameDayReasonCode" AS ENUM ('ELIGIBLE', 'AFTER_CUTOFF', 'OUT_OF_RADIUS', 'ADDRESS_UNVERIFIED', 'SAME_DAY_DISABLED', 'STORE_PICKUP');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DELIVERY_MANAGER';

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "addressType" "AddressType" NOT NULL DEFAULT 'HOME',
ADD COLUMN     "district" TEXT,
ADD COLUMN     "latitude" DECIMAL(10,7),
ADD COLUMN     "longitude" DECIMAL(10,7);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "courierName" TEXT,
ADD COLUMN     "courierTrackingNumber" TEXT,
ADD COLUMN     "courierTrackingUrl" TEXT,
ADD COLUMN     "customerShippingConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryAddressSnapshot" JSONB,
ADD COLUMN     "deliveryDistanceKm" DECIMAL(8,2),
ADD COLUMN     "deliveryFailedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryManagerId" TEXT,
ADD COLUMN     "deliveryPublicNote" TEXT,
ADD COLUMN     "deliveryStatus" "DeliveryStatus",
ADD COLUMN     "deliveryType" "DeliveryType",
ADD COLUMN     "deliveryZone" "DeliveryZone",
ADD COLUMN     "estimatedDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "pickupAt" TIMESTAMP(3),
ADD COLUMN     "returnedAt" TIMESTAMP(3),
ADD COLUMN     "sameDayEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sameDayReasonCode" "SameDayReasonCode",
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "shippingChargeStatus" "ShippingChargeStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
ADD COLUMN     "shippingConfirmationMethod" "ShippingConfirmationMethod";

-- CreateTable
CREATE TABLE "DeliverySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "storeName" TEXT NOT NULL DEFAULT 'The Cellphone Studio',
    "storeAddress" TEXT NOT NULL DEFAULT 'Vapi, Gujarat, India',
    "storeLatitude" DECIMAL(10,7),
    "storeLongitude" DECIMAL(10,7),
    "localRadiusKm" DECIMAL(8,2) NOT NULL DEFAULT 50,
    "localDeliveryCharge" DECIMAL(10,2) NOT NULL DEFAULT 350,
    "sameDayCutoff" TEXT NOT NULL DEFAULT '15:00',
    "sameDayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "indiaShippingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingConfirmation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "confirmedById" TEXT NOT NULL,
    "method" "ShippingConfirmationMethod" NOT NULL,
    "charge" DECIMAL(10,2) NOT NULL,
    "customerConsent" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShippingConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryOperation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "managerId" TEXT,
    "packagingCost" DECIMAL(10,2),
    "courierCost" DECIMAL(10,2),
    "otherCost" DECIMAL(10,2),
    "revenue" DECIMAL(10,2),
    "profit" DECIMAL(10,2),
    "packagingChecklist" JSONB,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "DeliveryStatus",
    "toStatus" "DeliveryStatus" NOT NULL,
    "note" TEXT,
    "actorUserId" TEXT,
    "actorType" "OrderActorType" NOT NULL,
    "isCustomerVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryContactLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "channel" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "note" TEXT,
    "isCustomerVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryContactLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingConfirmation_orderId_key" ON "ShippingConfirmation"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryOperation_orderId_key" ON "DeliveryOperation"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryStatusHistory_orderId_createdAt_idx" ON "DeliveryStatusHistory"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "DeliveryContactLog_orderId_createdAt_idx" ON "DeliveryContactLog"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_deliveryManagerId_deliveryStatus_idx" ON "Order"("deliveryManagerId", "deliveryStatus");

-- CreateIndex
CREATE INDEX "Order_deliveryZone_shippingChargeStatus_idx" ON "Order"("deliveryZone", "shippingChargeStatus");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryManagerId_fkey" FOREIGN KEY ("deliveryManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingConfirmation" ADD CONSTRAINT "ShippingConfirmation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingConfirmation" ADD CONSTRAINT "ShippingConfirmation_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOperation" ADD CONSTRAINT "DeliveryOperation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOperation" ADD CONSTRAINT "DeliveryOperation_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStatusHistory" ADD CONSTRAINT "DeliveryStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStatusHistory" ADD CONSTRAINT "DeliveryStatusHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryContactLog" ADD CONSTRAINT "DeliveryContactLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryContactLog" ADD CONSTRAINT "DeliveryContactLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
