-- CreateEnum
CREATE TYPE "EnquiryCategory" AS ENUM ('GENERAL', 'PRODUCT_INFORMATION', 'STOCK_AVAILABILITY', 'ORDER_SUPPORT', 'PAYMENT_SUPPORT', 'DELIVERY_SUPPORT', 'CANCELLATION_REQUEST', 'RETURN_OR_REFUND', 'WARRANTY_SUPPORT', 'WEBSITE_SUPPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_STORE', 'RESOLVED', 'CLOSED', 'SPAM');

-- CreateEnum
CREATE TYPE "EnquiryPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "EnquirySource" AS ENUM ('CONTACT_PAGE', 'ACCOUNT', 'ORDER_DETAIL', 'GUEST');

-- CreateEnum
CREATE TYPE "EnquiryMessageAuthor" AS ENUM ('CUSTOMER', 'ADMIN', 'SYSTEM', 'GUEST');

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "enquiryNumber" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "category" "EnquiryCategory" NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "EnquiryPriority" NOT NULL DEFAULT 'NORMAL',
    "source" "EnquirySource" NOT NULL DEFAULT 'CONTACT_PAGE',
    "internalNote" TEXT,
    "lastRespondedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryMessage" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorType" "EnquiryMessageAuthor" NOT NULL,
    "message" TEXT NOT NULL,
    "isCustomerVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnquiryMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_enquiryNumber_key" ON "Enquiry"("enquiryNumber");

-- CreateIndex
CREATE INDEX "Enquiry_status_createdAt_idx" ON "Enquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_priority_createdAt_idx" ON "Enquiry"("priority", "createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_userId_createdAt_idx" ON "Enquiry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_orderId_idx" ON "Enquiry"("orderId");

-- CreateIndex
CREATE INDEX "Enquiry_email_idx" ON "Enquiry"("email");

-- CreateIndex
CREATE INDEX "EnquiryMessage_enquiryId_createdAt_idx" ON "EnquiryMessage"("enquiryId", "createdAt");

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryMessage" ADD CONSTRAINT "EnquiryMessage_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryMessage" ADD CONSTRAINT "EnquiryMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
