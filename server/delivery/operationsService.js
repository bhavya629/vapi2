import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "./distance";
import { getDeliverySettings, serializeSettings } from "./deliveryService";

export class DeliveryOperationError extends Error {
  constructor(status, code, message) {
    super(message);
    Object.assign(this, { status, code });
  }
}
const orderInclude = {
  items: true,
  user: { select: { id: true, name: true, email: true, phone: true } },
  deliveryManager: {
    select: { id: true, name: true, email: true, phone: true },
  },
  deliveryStatusHistory: { orderBy: { createdAt: "asc" } },
  shippingConfirmation: true,
  deliveryOperation: true,
  deliveryContactLogs: { orderBy: { createdAt: "desc" } },
};
const number = (v) => (v == null ? null : Number(v)),
  text = (v, max = 300) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
export function mapDeliveryOrder(o, internal = true) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    total: number(o.total),
    subtotal: number(o.subtotal),
    deliveryCharge: number(o.deliveryCharge),
    placedAt: o.placedAt,
    customer: o.user,
    shippingAddress: {
      recipientName: o.recipientName,
      phone: o.shippingPhone,
      addressLine1: o.addressLine1,
      addressLine2: o.addressLine2,
      landmark: o.landmark,
      city: o.city,
      state: o.state,
      postalCode: o.postalCode,
      country: o.country,
    },
    delivery: {
      type: o.deliveryType,
      zone: o.deliveryZone,
      distanceKm: number(o.deliveryDistanceKm),
      shippingChargeStatus: o.shippingChargeStatus,
      status: o.deliveryStatus,
      manager: o.deliveryManager,
      sameDayEligible: o.sameDayEligible,
      sameDayReasonCode: o.sameDayReasonCode,
      courier: {
        name: o.courierName,
        trackingNumber: o.courierTrackingNumber,
        trackingUrl: o.courierTrackingUrl,
      },
      publicNote: o.deliveryPublicNote,
      history: o.deliveryStatusHistory,
      contacts: internal ? o.deliveryContactLogs : undefined,
      operation:
        internal && o.deliveryOperation
          ? {
              ...o.deliveryOperation,
              packagingCost: number(o.deliveryOperation.packagingCost),
              courierCost: number(o.deliveryOperation.courierCost),
              otherCost: number(o.deliveryOperation.otherCost),
              revenue: number(o.deliveryOperation.revenue),
              profit: number(o.deliveryOperation.profit),
            }
          : undefined,
    },
    items: o.items.map((i) => ({
      id: i.id,
      name: i.productName,
      quantity: i.quantity,
      imageUrl: i.imageUrl,
    })),
  };
}
export async function listDeliveryOrders(user, query = {}) {
  const page = Math.max(1, Number(query.page) || 1),
    take = Math.min(50, Math.max(1, Number(query.pageSize) || 20)),
    where = {
      fulfilmentMethod: "DELIVERY",
      ...(user.role === "DELIVERY_MANAGER"
        ? { OR: [{ deliveryManagerId: user.id }, { deliveryManagerId: null }] }
        : {}),
      ...(query.status ? { deliveryStatus: String(query.status) } : {}),
    };
  const [rows, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.order.count({ where }),
  ]);
  return {
    orders: rows.map(mapDeliveryOrder),
    pagination: { page, pageSize: take, total, pages: Math.ceil(total / take) },
  };
}
export async function getDeliveryOrder(user, id) {
  const order = await prisma.order.findFirst({
    where: {
      AND: [
        { OR: [{ id }, { orderNumber: id }] },
        user.role === "DELIVERY_MANAGER"
          ? {
              OR: [{ deliveryManagerId: user.id }, { deliveryManagerId: null }],
            }
          : {},
      ],
      fulfilmentMethod: "DELIVERY",
    },
    include: orderInclude,
  });
  if (!order)
    throw new DeliveryOperationError(
      404,
      "ORDER_NOT_FOUND",
      "Delivery order not found.",
    );
  return mapDeliveryOrder(order);
}
async function owned(user, id, tx = prisma) {
  const order = await tx.order.findFirst({
    where: {
      AND: [
        { OR: [{ id }, { orderNumber: id }] },
        user.role === "DELIVERY_MANAGER"
          ? {
              OR: [{ deliveryManagerId: user.id }, { deliveryManagerId: null }],
            }
          : {},
      ],
      fulfilmentMethod: "DELIVERY",
    },
  });
  if (!order)
    throw new DeliveryOperationError(
      404,
      "ORDER_NOT_FOUND",
      "Delivery order not found.",
    );
  return order;
}
export async function assignOrder(user, id, managerId) {
  return prisma.$transaction(async (tx) => {
    const o = await owned(user, id, tx),
      target = managerId || user.id,
      m = await tx.user.findFirst({
        where: { id: target, role: "DELIVERY_MANAGER", status: "ACTIVE" },
      });
    if (!m)
      throw new DeliveryOperationError(
        422,
        "INVALID_MANAGER",
        "Select an active delivery manager.",
      );
    await tx.order.update({
      where: { id: o.id },
      data: { deliveryManagerId: m.id },
    });
    return { assigned: true, manager: { id: m.id, name: m.name } };
  });
}
export async function verifyDistance(user, id, input) {
  return prisma.$transaction(async (tx) => {
    const o = await owned(user, id, tx),
      settings = serializeSettings(await getDeliverySettings(tx));
    let distance = Number(input.distanceKm);
    if (!Number.isFinite(distance)) {
      const snapshot = o.deliveryAddressSnapshot || {};
      distance = haversineDistanceKm(
        {
          latitude: settings.storeLatitude,
          longitude: settings.storeLongitude,
        },
        {
          latitude: input.latitude ?? snapshot.latitude,
          longitude: input.longitude ?? snapshot.longitude,
        },
      );
    }
    if (distance == null || distance < 0)
      throw new DeliveryOperationError(
        422,
        "INVALID_DISTANCE",
        "Provide verified coordinates or a non-negative distance.",
      );
    const local = distance <= settings.localRadiusKm,
      status = local
        ? o.deliveryManagerId
          ? "PACKAGING_PENDING"
          : "AWAITING_ASSIGNMENT"
        : "AWAITING_SHIPPING_CONFIRMATION";
    await tx.order.update({
      where: { id: o.id },
      data: {
        deliveryDistanceKm: distance,
        deliveryZone: local ? "WITHIN_50_KM" : "BEYOND_50_KM",
        deliveryType: local ? "SAME_DAY_LOCAL" : "OUTSTATION_CONFIRMATION",
        deliveryCharge: local ? settings.localDeliveryCharge : 0,
        total: local
          ? new Prisma.Decimal(o.subtotal).add(settings.localDeliveryCharge)
          : o.subtotal,
        shippingChargeStatus: local ? "FIXED" : "PENDING_CONFIRMATION",
        deliveryStatus: status,
        sameDayEligible: false,
        sameDayReasonCode: local ? "AFTER_CUTOFF" : "OUT_OF_RADIUS",
      },
    });
    await tx.deliveryStatusHistory.create({
      data: {
        orderId: o.id,
        fromStatus: o.deliveryStatus,
        toStatus: status,
        actorUserId: user.id,
        actorType: user.role === "ADMIN" ? "ADMIN" : "SYSTEM",
        note: `Verified delivery distance: ${distance.toFixed(2)} km.`,
      },
    });
    return {
      distanceKm: distance,
      zone: local ? "WITHIN_50_KM" : "BEYOND_50_KM",
    };
  });
}
export async function confirmShipping(user, id, input) {
  const charge = Number(input.charge);
  if (!Number.isFinite(charge) || charge <= 0)
    throw new DeliveryOperationError(
      422,
      "INVALID_SHIPPING_CHARGE",
      "Enter a positive confirmed shipping charge.",
    );
  if (
    !["PHONE_CALL", "WHATSAPP", "SMS", "EMAIL", "IN_PERSON", "OTHER"].includes(
      input.method,
    )
  )
    throw new DeliveryOperationError(
      422,
      "INVALID_METHOD",
      "Select a valid confirmation method.",
    );
  if (input.customerConsent !== true)
    throw new DeliveryOperationError(
      422,
      "CUSTOMER_CONSENT_REQUIRED",
      "Record explicit customer consent before confirming shipping.",
    );
  return prisma.$transaction(async (tx) => {
    const o = await owned(user, id, tx);
    if (o.paymentStatus === "PAID")
      throw new DeliveryOperationError(
        409,
        "CAPTURED_PAYMENT_IMMUTABLE",
        "A captured payment amount cannot be changed.",
      );
    if (o.deliveryZone !== "BEYOND_50_KM")
      throw new DeliveryOperationError(
        409,
        "CONFIRMATION_NOT_REQUIRED",
        "This order is not an outstation delivery.",
      );
    const existing = await tx.shippingConfirmation.findUnique({
      where: { orderId: o.id },
    });
    if (existing) return existing;
    const confirmation = await tx.shippingConfirmation.create({
      data: {
        orderId: o.id,
        confirmedById: user.id,
        method: input.method,
        charge,
        customerConsent: input.customerConsent === true,
        note: text(input.note),
      },
    });
    const nextStatus =
      o.paymentMethod === "ONLINE" ? "PENDING_PAYMENT" : "PENDING_CONFIRMATION";
    await tx.order.update({
      where: { id: o.id },
      data: {
        deliveryCharge: charge,
        total: new Prisma.Decimal(o.subtotal)
          .add(charge)
          .sub(o.discount)
          .add(o.tax),
        shippingChargeStatus: "CONFIRMED",
        deliveryStatus: "SHIPPING_CONFIRMED",
        customerShippingConfirmedAt: new Date(),
        shippingConfirmationMethod: input.method,
        status: nextStatus,
      },
    });
    await tx.deliveryStatusHistory.create({
      data: {
        orderId: o.id,
        fromStatus: o.deliveryStatus,
        toStatus: "SHIPPING_CONFIRMED",
        actorUserId: user.id,
        actorType: user.role === "ADMIN" ? "ADMIN" : "SYSTEM",
        note: "Customer confirmed the outstation shipping charge by phone or recorded channel.",
      },
    });
    return confirmation;
  });
}
export async function updateDeliveryStatus(user, id, input) {
  const allowed = [
      "AWAITING_ASSIGNMENT",
      "AWAITING_DISTANCE_VERIFICATION",
      "AWAITING_SHIPPING_CONFIRMATION",
      "SHIPPING_CONFIRMED",
      "PACKAGING_PENDING",
      "PACKED",
      "READY_FOR_DISPATCH",
      "OUT_FOR_DELIVERY",
      "SHIPPED",
      "DELIVERED",
      "DELIVERY_FAILED",
      "RETURNED",
      "CANCELLED",
    ],
    next = String(input.status || "");
  if (!allowed.includes(next))
    throw new DeliveryOperationError(
      422,
      "INVALID_STATUS",
      "Select a valid delivery status.",
    );
  return prisma.$transaction(async (tx) => {
    const o = await owned(user, id, tx),
      now = new Date(),
      timestamps =
        next === "PACKED"
          ? { packedAt: now }
          : next === "OUT_FOR_DELIVERY"
            ? { outForDeliveryAt: now }
            : next === "SHIPPED"
              ? { shippedAt: now }
              : next === "DELIVERED"
                ? { deliveredAt: now }
                : next === "DELIVERY_FAILED"
                  ? { deliveryFailedAt: now }
                  : next === "RETURNED"
                    ? { returnedAt: now }
                    : {};
    await tx.order.update({
      where: { id: o.id },
      data: {
        deliveryStatus: next,
        deliveryPublicNote: text(input.publicNote) || undefined,
        ...timestamps,
      },
    });
    await tx.deliveryStatusHistory.create({
      data: {
        orderId: o.id,
        fromStatus: o.deliveryStatus,
        toStatus: next,
        actorUserId: user.id,
        actorType: user.role === "ADMIN" ? "ADMIN" : "SYSTEM",
        note: text(input.note) || null,
        isCustomerVisible: input.isCustomerVisible !== false,
      },
    });
    return { status: next };
  });
}
export async function updateCourier(user, id, input) {
  const o = await owned(user, id);
  return prisma.order.update({
    where: { id: o.id },
    data: {
      courierName: text(input.name, 80) || null,
      courierTrackingNumber: text(input.trackingNumber, 100) || null,
      courierTrackingUrl: text(input.trackingUrl, 500) || null,
    },
  });
}
export async function updateCosts(user, id, input) {
  const o = await owned(user, id),
    packaging = Math.max(0, Number(input.packagingCost) || 0),
    courier = Math.max(0, Number(input.courierCost) || 0),
    other = Math.max(0, Number(input.otherCost) || 0),
    revenue = Number(o.deliveryCharge),
    profit = revenue - packaging - courier - other;
  return prisma.deliveryOperation.upsert({
    where: { orderId: o.id },
    update: {
      managerId: o.deliveryManagerId || user.id,
      packagingCost: packaging,
      courierCost: courier,
      otherCost: other,
      revenue,
      profit,
      internalNote: text(input.internalNote),
    },
    create: {
      orderId: o.id,
      managerId: o.deliveryManagerId || user.id,
      packagingCost: packaging,
      courierCost: courier,
      otherCost: other,
      revenue,
      profit,
      internalNote: text(input.internalNote),
    },
  });
}
export async function logContact(user, id, input) {
  const o = await owned(user, id),
    channel = text(input.channel, 40),
    outcome = text(input.outcome, 100);
  if (!channel || !outcome)
    throw new DeliveryOperationError(
      422,
      "INVALID_CONTACT",
      "Channel and outcome are required.",
    );
  return prisma.deliveryContactLog.create({
    data: {
      orderId: o.id,
      actorUserId: user.id,
      channel,
      outcome,
      note: text(input.note),
      isCustomerVisible: input.isCustomerVisible === true,
    },
  });
}
export async function deliveryEarnings(user) {
  const where = user.role === "DELIVERY_MANAGER" ? { managerId: user.id } : {},
    rows = await prisma.deliveryOperation.findMany({ where });
  return {
    orders: rows.length,
    revenue: rows.reduce((s, r) => s + number(r.revenue), 0),
    costs: rows.reduce(
      (s, r) =>
        s +
        number(r.packagingCost) +
        number(r.courierCost) +
        number(r.otherCost),
      0,
    ),
    profit: rows.reduce((s, r) => s + number(r.profit), 0),
  };
}
