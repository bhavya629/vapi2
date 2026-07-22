import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  hashValue,
  publicKey,
  verifyCheckoutSignature,
} from "./razorpayClient";
export class PaymentError extends Error {
  constructor(status, code, message) {
    super(message);
    Object.assign(this, { status, code });
  }
}
export function toMinorUnits(value) {
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text))
    throw new PaymentError(422, "INVALID_AMOUNT", "Invalid payment amount.");
  const [whole, part = ""] = text.split(".");
  const result = BigInt(whole) * 100n + BigInt(part.padEnd(2, "0"));
  if (result <= 0n || result > BigInt(Number.MAX_SAFE_INTEGER))
    throw new PaymentError(422, "INVALID_AMOUNT", "Invalid payment amount.");
  return Number(result);
}
const owned = (userId, number) =>
  prisma.order.findFirst({
    where: { userId, orderNumber: number },
    include: {
      payments: { orderBy: { createdAt: "desc" } },
      reservations: true,
    },
  });
async function releaseExpired(orderId) {
  await prisma.$transaction(async (tx) => {
    const expired = await tx.inventoryReservation.findMany({
      where: { orderId, status: "ACTIVE", expiresAt: { lt: new Date() } },
    });
    for (const r of expired) {
      if (r.variantColourId)
        await tx.productVariantColour.updateMany({
          where: { id: r.variantColourId, reservedStock: { gte: r.quantity } },
          data: { reservedStock: { decrement: r.quantity } },
        });
      else
        await tx.product.updateMany({
          where: { id: r.productId, reservedStock: { gte: r.quantity } },
          data: { reservedStock: { decrement: r.quantity } },
        });
      await tx.inventoryReservation.update({
        where: { id: r.id },
        data: { status: "EXPIRED", releasedAt: new Date() },
      });
    }
  });
}
export async function createAttempt(userId, orderNumber, retry = false) {
  let order = await owned(userId, orderNumber);
  if (!order)
    throw new PaymentError(404, "ORDER_NOT_FOUND", "Order not found.");
  if (
    order.paymentMethod !== "ONLINE" ||
    order.status !== "PENDING_PAYMENT" ||
    order.shippingChargeStatus === "PENDING_CONFIRMATION"
  )
    throw new PaymentError(
      409,
      "ORDER_NOT_PAYABLE",
      "This order is not awaiting online payment.",
    );
  if (order.paymentStatus === "PAID")
    throw new PaymentError(
      409,
      "PAYMENT_ALREADY_COMPLETED",
      "This order has already been paid.",
    );
  await releaseExpired(order.id);
  order = await owned(userId, orderNumber);
  const activeReservation = order.reservations.some(
    (r) => r.status === "ACTIVE" && new Date(r.expiresAt) > new Date(),
  );
  const confirmedOutstation =
    order.deliveryType === "OUTSTATION_CONFIRMATION" &&
    order.shippingChargeStatus === "CONFIRMED";
  if (!activeReservation && !confirmedOutstation)
    throw new PaymentError(
      409,
      "PAYMENT_ORDER_EXPIRED",
      "This payment session has expired. Start a new checkout order.",
    );
  const active = order.payments.find(
    (p) =>
      ["CREATED", "PENDING", "AUTHORIZED"].includes(p.status) &&
      Date.now() - new Date(p.createdAt).getTime() < 10 * 60 * 1000,
  );
  if (active && !retry) return checkout(order, active);
  const recent = order.payments.filter(
    (p) => Date.now() - new Date(p.createdAt).getTime() < 10 * 60 * 1000,
  );
  if (recent.length >= 5)
    throw new PaymentError(
      429,
      "PAYMENT_ATTEMPT_LIMIT",
      "Too many payment attempts. Please wait before trying again.",
    );
  const amount = toMinorUnits(order.total.toFixed(2));
  let provider;
  try {
    provider = await createRazorpayOrder({
      amount,
      currency: "INR",
      receipt: order.orderNumber.slice(0, 40),
      notes: { orderNumber: order.orderNumber, internalOrderId: order.id },
    });
  } catch {
    throw new PaymentError(
      503,
      "PAYMENT_CONFIGURATION_ERROR",
      "Online payment is temporarily unavailable. Please use another payment method or try again later.",
    );
  }
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      userId,
      providerOrderId: provider.id,
      status: "PENDING",
      amount: order.total,
      currency: "INR",
      email: order.customerEmail,
      contact: order.phone,
    },
  });
  return checkout(order, payment);
}
function checkout(order, payment) {
  return {
    keyId: publicKey(),
    razorpayOrderId: payment.providerOrderId,
    amount: toMinorUnits(payment.amount.toFixed(2)),
    currency: payment.currency,
    orderNumber: order.orderNumber,
    customer: {
      name: order.fullName,
      email: order.customerEmail,
      contact: order.phone,
    },
  };
}
export async function settlePayment({
  providerOrderId,
  providerPaymentId,
  signature,
  providerEntity,
}) {
  const payment = await prisma.payment.findUnique({
    where: { providerOrderId },
    include: { order: { include: { items: true, reservations: true } } },
  });
  if (!payment)
    throw new PaymentError(
      404,
      "PAYMENT_NOT_FOUND",
      "Payment attempt not found.",
    );
  if (payment.status === "PAID" && payment.order.paymentStatus === "PAID")
    return payment.order;
  if (!providerEntity) {
    if (!verifyCheckoutSignature(providerOrderId, providerPaymentId, signature))
      throw new PaymentError(
        400,
        "PAYMENT_VERIFICATION_FAILED",
        "We could not verify this payment. Your order has not been marked as paid.",
      );
    try {
      providerEntity = await fetchRazorpayPayment(providerPaymentId);
    } catch {
      throw new PaymentError(
        502,
        "PAYMENT_VERIFICATION_FAILED",
        "We could not verify this payment. Your order has not been marked as paid.",
      );
    }
  }
  if (
    providerEntity.order_id !== providerOrderId ||
    Number(providerEntity.amount) !== toMinorUnits(payment.amount.toFixed(2)) ||
    providerEntity.currency !== payment.currency ||
    !(providerEntity.captured || providerEntity.status === "captured")
  )
    throw new PaymentError(
      409,
      "PAYMENT_AMOUNT_MISMATCH",
      "We could not confirm the payment amount. Please contact the store.",
    );
  return prisma.$transaction(
    async (tx) => {
      const current = await tx.payment.findUnique({
        where: { id: payment.id },
        include: { order: true },
      });
      if (current.status === "PAID" && current.order.paymentStatus === "PAID")
        return current.order;
      if (current.order.paymentStatus === "PAID")
        throw new PaymentError(
          409,
          "PAYMENT_ALREADY_COMPLETED",
          "This order has already been paid.",
        );
      const reservations = await tx.inventoryReservation.findMany({
        where: { orderId: current.orderId, status: "ACTIVE" },
      });
      const confirmedOutstation =
        current.order.deliveryType === "OUTSTATION_CONFIRMATION" &&
        current.order.shippingChargeStatus === "CONFIRMED";
      if (!reservations.length && !confirmedOutstation)
        throw new PaymentError(
          409,
          "PAYMENT_ORDER_EXPIRED",
          "This payment reservation requires manual review.",
        );
      for (const r of reservations) {
        const p = await tx.product.findUnique({ where: { id: r.productId } });
        const combination = r.variantColourId
          ? await tx.productVariantColour.findUnique({
              where: { id: r.variantColourId },
            })
          : null;
        const changed = combination
          ? await tx.productVariantColour.updateMany({
              where: {
                id: combination.id,
                stock: { gte: r.quantity },
                reservedStock: { gte: r.quantity },
              },
              data: {
                stock: { decrement: r.quantity },
                reservedStock: { decrement: r.quantity },
              },
            })
          : await tx.product.updateMany({
              where: {
                id: r.productId,
                stock: { gte: r.quantity },
                reservedStock: { gte: r.quantity },
              },
              data: {
                stock: { decrement: r.quantity },
                reservedStock: { decrement: r.quantity },
              },
            });
        if (changed.count !== 1)
          throw new PaymentError(
            409,
            "PAYMENT_INVENTORY_REVIEW",
            "Payment received but inventory requires store review.",
          );
        await tx.inventoryReservation.update({
          where: { id: r.id },
          data: { status: "CONVERTED", convertedAt: new Date() },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: r.productId,
            variantColourId: r.variantColourId,
            quantityChange: -r.quantity,
            previousStock: combination?.stock ?? p.stock,
            newStock: (combination?.stock ?? p.stock) - r.quantity,
            reason: "ORDER_DEDUCTION",
            referenceType: "ORDER",
            referenceId: current.orderId,
            note: `Verified online payment ${current.order.orderNumber}`,
          },
        });
      }
      const now = new Date();
      await tx.payment.update({
        where: { id: current.id },
        data: {
          status: "PAID",
          providerPaymentId,
          captured: true,
          signatureHash: signature ? hashValue(signature) : null,
          verifiedAt: now,
          method: providerEntity.method || null,
        },
      });
      await tx.payment.updateMany({
        where: {
          orderId: current.orderId,
          id: { not: current.id },
          status: { in: ["CREATED", "PENDING", "AUTHORIZED"] },
        },
        data: {
          status: "FAILED",
          failedAt: now,
          errorReason: "Another attempt completed the order.",
        },
      });
      await tx.order.update({
        where: { id: current.orderId },
        data: {
          paymentStatus: "PAID",
          status: "PENDING_CONFIRMATION",
          paidAt: now,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: current.orderId,
          fromStatus: "PENDING_PAYMENT",
          toStatus: "PENDING_CONFIRMATION",
          actorType: "SYSTEM",
          note: "Online payment verified. Awaiting store confirmation.",
          isCustomerVisible: true,
        },
      });
      return tx.order.findUnique({ where: { id: current.orderId } });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15000,
    },
  );
}
export async function verifyPayment(userId, input) {
  const keys = [
    "orderNumber",
    "razorpay_order_id",
    "razorpay_payment_id",
    "razorpay_signature",
  ];
  if (
    Object.keys(input || {}).some((k) => !keys.includes(k)) ||
    keys.some((k) => !String(input?.[k] || "").trim())
  )
    throw new PaymentError(
      422,
      "INVALID_PAYMENT_RESPONSE",
      "Payment response is incomplete.",
    );
  const order = await owned(userId, String(input.orderNumber));
  if (!order)
    throw new PaymentError(404, "ORDER_NOT_FOUND", "Order not found.");
  const p = order.payments.find(
    (x) => x.providerOrderId === input.razorpay_order_id,
  );
  if (!p)
    throw new PaymentError(
      404,
      "PAYMENT_NOT_FOUND",
      "Payment attempt not found.",
    );
  const result = await settlePayment({
    providerOrderId: p.providerOrderId,
    providerPaymentId: input.razorpay_payment_id,
    signature: input.razorpay_signature,
  });
  return {
    orderNumber: result.orderNumber,
    orderStatus: result.status,
    paymentStatus: result.paymentStatus,
    redirectPath: `/order-success?order=${encodeURIComponent(result.orderNumber)}`,
  };
}
export async function paymentSummary(userId, orderNumber) {
  const order = await owned(userId, orderNumber);
  if (!order)
    throw new PaymentError(404, "ORDER_NOT_FOUND", "Order not found.");
  const p = order.payments[0];
  return {
    orderNumber,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    latestAttemptStatus: p?.status || null,
    amount: order.total.toFixed(2),
    currency: order.currency,
    provider: p?.provider || null,
    providerPaymentId: p?.providerPaymentId
      ? `${p.providerPaymentId.slice(0, 8)}••••`
      : null,
    canRetry:
      order.paymentMethod === "ONLINE" &&
      order.paymentStatus !== "PAID" &&
      order.status === "PENDING_PAYMENT",
    createdAt: p?.createdAt || null,
    verifiedAt: p?.verifiedAt || null,
    failureMessage: p?.errorDescription || null,
  };
}
