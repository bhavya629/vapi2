import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  allowedTransitions,
  allStatuses,
  assertTransition,
} from "./orderTransition";
export class AdminOrderError extends Error {
  constructor(status, code, message) {
    super(message);
    Object.assign(this, { status, code });
  }
}
const include = {
  items: true,
  payments: { orderBy: { createdAt: "desc" } },
  statusHistory: { orderBy: { createdAt: "asc" } },
  deliveryManager: { select: { id: true, name: true, phone: true } },
  deliveryStatusHistory: { orderBy: { createdAt: "asc" } },
  shippingConfirmation: true,
  deliveryOperation: true,
};
const cash = (v) => Number(v || 0).toFixed(2);
const clean = (v, max = 500) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
function dto(o, detail = false) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.fullName,
    customerEmail: o.customerEmail,
    customerPhone: o.phone,
    itemCount: o._count?.items ?? o.items?.length ?? 0,
    items: detail
      ? o.items?.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          brandName: i.brandName,
          imageUrl: i.imageUrl,
          productVariantId: i.productVariantId,
          productVariantColourId: i.productVariantColourId,
          ram: i.ram,
          storage: i.storage,
          colourName: i.colourName,
          sku: i.variantSku || i.productSku,
          quantity: i.quantity,
          unitPrice: cash(i.unitPrice),
          lineTotal: cash(i.lineTotal),
        }))
      : undefined,
    fulfilmentMethod: o.fulfilmentMethod,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    status: o.status,
    total: cash(o.total),
    subtotal: cash(o.subtotal),
    deliveryCharge: cash(o.deliveryCharge),
    delivery: {
      type: o.deliveryType,
      zone: o.deliveryZone,
      distanceKm: o.deliveryDistanceKm ? Number(o.deliveryDistanceKm) : null,
      shippingChargeStatus: o.shippingChargeStatus,
      status: o.deliveryStatus,
      manager: o.deliveryManager,
      sameDayEligible: o.sameDayEligible,
      sameDayReasonCode: o.sameDayReasonCode,
      courierName: o.courierName,
      trackingNumber: o.courierTrackingNumber,
      history: detail ? o.deliveryStatusHistory : undefined,
      confirmation: detail ? o.shippingConfirmation : undefined,
      operation: detail ? o.deliveryOperation : undefined,
    },
    discount: cash(o.discount),
    tax: cash(o.tax),
    placedAt: o.placedAt,
    updatedAt: o.updatedAt,
    confirmedAt: o.confirmedAt,
    packedAt: o.packedAt,
    readyForPickupAt: o.readyForPickupAt,
    outForDeliveryAt: o.outForDeliveryAt,
    deliveredAt: o.deliveredAt,
    cancelledAt: o.cancelledAt,
    cancellationReason: o.cancellationReason,
    inventoryRestoredAt: o.inventoryRestoredAt,
    address:
      detail && o.fulfilmentMethod === "DELIVERY"
        ? {
            label: o.addressLabel,
            recipientName: o.recipientName,
            phone: o.shippingPhone,
            line1: o.addressLine1,
            line2: o.addressLine2,
            landmark: o.landmark,
            city: o.city,
            state: o.state,
            postalCode: o.postalCode,
            country: o.country,
          }
        : null,
    customerNote: detail ? o.customerNote : undefined,
    internalNote: detail ? o.internalNote : undefined,
    statusHistory: detail
      ? o.statusHistory?.map((h) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          note: h.note,
          actorType: h.actorType,
          isCustomerVisible: h.isCustomerVisible,
          createdAt: h.createdAt,
        }))
      : undefined,
    allowedTransitions: detail ? allowedTransitions(o) : undefined,
  };
}
export async function listAdminOrders(q = {}) {
  const page = Math.max(1, Number(q.page) || 1),
    limit = Math.min(50, Math.max(1, Number(q.limit) || 20));
  for (const [key, set] of [
    ["status", allStatuses],
    [
      "paymentStatus",
      [
        "NOT_REQUIRED",
        "PENDING",
        "PAID",
        "FAILED",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
      ],
    ],
    ["paymentMethod", ["CASH_ON_DELIVERY", "PAY_AT_STORE", "ONLINE"]],
    ["fulfilmentMethod", ["DELIVERY", "STORE_PICKUP"]],
  ])
    if (q[key] && q[key] !== "ALL" && !set.includes(q[key]))
      throw new AdminOrderError(
        422,
        "INVALID_FILTER",
        `Invalid ${key} filter.`,
      );
  const where = {
    ...(q.search
      ? {
          OR: ["orderNumber", "fullName", "phone", "customerEmail"].map(
            (k) => ({
              [k]: {
                contains: String(q.search).slice(0, 100),
                mode: "insensitive",
              },
            }),
          ),
        }
      : {}),
    ...(q.status && q.status !== "ALL" ? { status: q.status } : {}),
    ...(q.paymentStatus && q.paymentStatus !== "ALL"
      ? { paymentStatus: q.paymentStatus }
      : {}),
    ...(q.paymentMethod && q.paymentMethod !== "ALL"
      ? { paymentMethod: q.paymentMethod }
      : {}),
    ...(q.fulfilmentMethod && q.fulfilmentMethod !== "ALL"
      ? { fulfilmentMethod: q.fulfilmentMethod }
      : {}),
    ...(q.dateFrom || q.dateTo
      ? {
          placedAt: {
            ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
            ...(q.dateTo ? { lte: new Date(`${q.dateTo}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(q.minTotal || q.maxTotal
      ? {
          total: {
            ...(q.minTotal ? { gte: q.minTotal } : {}),
            ...(q.maxTotal ? { lte: q.maxTotal } : {}),
          },
        }
      : {}),
  };
  if (
    Object.values(where.placedAt || {}).some((d) => Number.isNaN(d.getTime()))
  )
    throw new AdminOrderError(422, "INVALID_DATE", "Invalid date filter.");
  const sort = {
    newest: { placedAt: "desc" },
    oldest: { placedAt: "asc" },
    "total-high": { total: "desc" },
    "total-low": { total: "asc" },
    "recently-updated": { updatedAt: "desc" },
  }[q.sort || "newest"];
  if (!sort)
    throw new AdminOrderError(422, "INVALID_SORT", "Invalid sort option.");
  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: sort,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);
  return {
    orders: orders.map((o) => dto(o)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}
export async function adminOrder(identifier) {
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: identifier }, { orderNumber: identifier }] },
    include,
  });
  if (!o) throw new AdminOrderError(404, "ORDER_NOT_FOUND", "Order not found.");
  const result = dto(o, true);
  result.payments = o.payments.map((p) => ({
    provider: p.provider,
    providerOrderId: p.providerOrderId,
    providerPaymentId: p.providerPaymentId,
    status: p.status,
    amount: cash(p.amount),
    currency: p.currency,
    method: p.method,
    verifiedAt: p.verifiedAt,
    failedAt: p.failedAt,
    errorCode: p.errorCode,
    errorDescription: p.errorDescription,
    captured: p.captured,
    createdAt: p.createdAt,
  }));
  return result;
}
function timestamps(target) {
  return target === "CONFIRMED"
    ? { confirmedAt: new Date() }
    : target === "PACKED"
      ? { packedAt: new Date() }
      : target === "READY_FOR_PICKUP"
        ? { readyForPickupAt: new Date() }
        : target === "OUT_FOR_DELIVERY"
          ? { outForDeliveryAt: new Date() }
          : target === "DELIVERED"
            ? { deliveredAt: new Date() }
            : {};
}
export async function updateStatus(identifier, input, admin) {
  const allowed = ["status", "note", "customerVisible"];
  if (Object.keys(input || {}).some((k) => !allowed.includes(k)))
    throw new AdminOrderError(
      422,
      "UNKNOWN_FIELD",
      "Unsupported request field.",
    );
  const note = clean(input.note);
  return prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findFirst({
        where: { OR: [{ id: identifier }, { orderNumber: identifier }] },
      });
      if (!order)
        throw new AdminOrderError(404, "ORDER_NOT_FOUND", "Order not found.");
      try {
        assertTransition(order, input.status);
      } catch (e) {
        throw new AdminOrderError(e.status, e.code, e.message);
      }
      if (input.status === "CANCELLED")
        throw new AdminOrderError(
          422,
          "USE_CANCEL_ENDPOINT",
          "Use the cancellation endpoint.",
        );
      const changed = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: input.status, ...timestamps(input.status) },
      });
      if (changed.count !== 1)
        throw new AdminOrderError(
          409,
          "ORDER_STATUS_CONFLICT",
          "This order was updated by another request. Refresh and try again.",
        );
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: input.status,
          note: note || null,
          actorUserId: admin.id,
          actorType: "ADMIN",
          isCustomerVisible: input.customerVisible !== false,
        },
      });
      return dto(
        await tx.order.findUnique({ where: { id: order.id }, include }),
        true,
      );
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
export async function cancelOrder(identifier, input, admin) {
  const reason = clean(input?.reason, 300),
    publicNote = clean(input?.customerVisibleNote, 300);
  if (!reason)
    throw new AdminOrderError(
      422,
      "CANCELLATION_REASON_REQUIRED",
      "Cancellation reason is required.",
    );
  return prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findFirst({
        where: { OR: [{ id: identifier }, { orderNumber: identifier }] },
        include: { items: true, reservations: true },
      });
      if (!order)
        throw new AdminOrderError(404, "ORDER_NOT_FOUND", "Order not found.");
      if (order.status === "CANCELLED")
        return dto(
          await tx.order.findUnique({ where: { id: order.id }, include }),
          true,
        );
      if (
        ![
          "PENDING",
          "PENDING_PAYMENT",
          "PENDING_CONFIRMATION",
          "CONFIRMED",
          "PROCESSING",
          "PACKED",
          "READY_FOR_PICKUP",
        ].includes(order.status)
      )
        throw new AdminOrderError(
          409,
          "ORDER_NOT_CANCELLABLE",
          "This order can no longer be cancelled.",
        );
      if (order.inventoryRestoredAt)
        throw new AdminOrderError(
          409,
          "INVENTORY_ALREADY_RESTORED",
          "Inventory was already restored for this order.",
        );
      const pendingOnline =
        order.paymentMethod === "ONLINE" && order.paymentStatus !== "PAID";
      if (pendingOnline) {
        for (const r of order.reservations.filter(
          (x) => x.status === "ACTIVE",
        )) {
          if (r.variantColourId)
            await tx.productVariantColour.updateMany({
              where: {
                id: r.variantColourId,
                reservedStock: { gte: r.quantity },
              },
              data: { reservedStock: { decrement: r.quantity } },
            });
          else
            await tx.product.updateMany({
              where: { id: r.productId, reservedStock: { gte: r.quantity } },
              data: { reservedStock: { decrement: r.quantity } },
            });
          await tx.inventoryReservation.update({
            where: { id: r.id },
            data: { status: "RELEASED", releasedAt: new Date() },
          });
        }
      } else
        for (const item of order.items) {
          if (!item.productId) continue;
          const stockRecord = item.productVariantColourId
            ? await tx.productVariantColour.update({
                where: { id: item.productVariantColourId },
                data: { stock: { increment: item.quantity } },
                select: { stock: true },
              })
            : await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
                select: { stock: true },
              });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              variantColourId: item.productVariantColourId,
              quantityChange: item.quantity,
              previousStock: stockRecord.stock - item.quantity,
              newStock: stockRecord.stock,
              reason: "ORDER_CANCELLATION",
              referenceType: "ORDER",
              referenceId: order.id,
              note: `Cancellation ${order.orderNumber}: ${reason}`,
              adminUserId: admin.id,
            },
          });
        }
      const now = new Date(),
        changed = await tx.order.updateMany({
          where: {
            id: order.id,
            status: order.status,
            inventoryRestoredAt: null,
          },
          data: {
            status: "CANCELLED",
            cancelledAt: now,
            cancellationReason: reason,
            inventoryRestoredAt: now,
          },
        });
      if (changed.count !== 1)
        throw new AdminOrderError(
          409,
          "ORDER_STATUS_CONFLICT",
          "This order was updated by another request. Refresh and try again.",
        );
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "CANCELLED",
          note: publicNote || "Order cancelled by the store.",
          actorUserId: admin.id,
          actorType: "ADMIN",
          isCustomerVisible: true,
        },
      });
      return dto(
        await tx.order.findUnique({ where: { id: order.id }, include }),
        true,
      );
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
export async function updateNotes(identifier, input, admin) {
  if (Object.keys(input || {}).some((k) => k !== "internalNote"))
    throw new AdminOrderError(
      422,
      "UNKNOWN_FIELD",
      "Unsupported request field.",
    );
  const internalNote = clean(input.internalNote, 1000);
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: identifier }, { orderNumber: identifier }] },
  });
  if (!order)
    throw new AdminOrderError(404, "ORDER_NOT_FOUND", "Order not found.");
  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: order.id },
      data: { internalNote },
    });
    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "ORDER_INTERNAL_NOTE_UPDATED",
        entityType: "Order",
        entityId: order.id,
        metadata: { orderNumber: order.orderNumber },
      },
    });
    return o;
  });
  return dto(
    await prisma.order.findUnique({ where: { id: updated.id }, include }),
    true,
  );
}
export async function orderStats() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const groups = await prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    recent = await prisma.order.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: { placedAt: "desc" },
      take: 5,
    });
  const count = (s) => groups.find((x) => x.status === s)?._count._all || 0;
  return {
    awaitingConfirmation: count("PENDING_CONFIRMATION"),
    active: count("CONFIRMED") + count("PROCESSING"),
    packed: count("PACKED"),
    outForDelivery: count("OUT_FOR_DELIVERY"),
    readyForPickup: count("READY_FOR_PICKUP"),
    deliveredToday: await prisma.order.count({
      where: { status: "DELIVERED", deliveredAt: { gte: start } },
    }),
    cancelledToday: await prisma.order.count({
      where: { status: "CANCELLED", cancelledAt: { gte: start } },
    }),
    recentOrders: recent.map((o) => dto(o)),
  };
}
