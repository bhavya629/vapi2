import crypto from "crypto";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getOwnedAddress,
  validateAddress,
} from "@/server/addresses/addressService";
import {
  findSoleDeliveryManager,
  initialDeliveryStatus,
  previewDelivery,
} from "@/server/delivery/deliveryService";

export class OrderError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}
const money = (value) => new Prisma.Decimal(value || 0);
const cash = (value) => money(value).toFixed(2);
const includeOrder = {
  items: true,
  payments: { orderBy: { createdAt: "desc" }, take: 1 },
  statusHistory: { orderBy: { createdAt: "asc" } },
  deliveryStatusHistory: {
    where: { isCustomerVisible: true },
    orderBy: { createdAt: "asc" },
  },
};

function validate(input = {}, requirePayment = true) {
  if (
    !Array.isArray(input.items) ||
    !input.items.length ||
    input.items.length > 50
  )
    throw new OrderError(
      422,
      "INVALID_ITEMS",
      "Your order must contain between 1 and 50 items.",
    );
  const items = input.items.map((item) => ({
    productId: String(item?.productId || "").trim(),
    productVariantId: String(item?.productVariantId || "").trim() || null,
    productVariantColourId:
      String(item?.productVariantColourId || "").trim() || null,
    productType: String(item?.productType || "").toUpperCase(),
    quantity: Number(item?.quantity),
  }));
  if (
    items.some(
      (item) =>
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 10,
    )
  )
    throw new OrderError(
      422,
      "INVALID_ITEMS",
      "Each item needs a valid product identifier and quantity from 1 to 10.",
    );
  if (!["DELIVERY", "STORE_PICKUP"].includes(input.fulfilmentMethod))
    throw new OrderError(
      422,
      "INVALID_FULFILMENT",
      "Select delivery or store pickup.",
    );
  if (
    requirePayment &&
    !["CASH_ON_DELIVERY", "PAY_AT_STORE", "ONLINE"].includes(
      input.paymentMethod,
    )
  )
    throw new OrderError(
      422,
      "INVALID_PAYMENT_METHOD",
      "Select an available payment method.",
    );
  if (
    requirePayment &&
    input.fulfilmentMethod === "DELIVERY" &&
    !["CASH_ON_DELIVERY", "ONLINE"].includes(input.paymentMethod)
  )
    throw new OrderError(
      422,
      "INVALID_PAYMENT_METHOD",
      "Select Cash on Delivery or Online Payment.",
    );
  if (
    requirePayment &&
    input.fulfilmentMethod === "STORE_PICKUP" &&
    !["PAY_AT_STORE", "ONLINE"].includes(input.paymentMethod)
  )
    throw new OrderError(
      422,
      "INVALID_PAYMENT_METHOD",
      "Select Pay at Store or Online Payment.",
    );
  const customerNote =
    typeof input.customerNote === "string" ? input.customerNote.trim() : "";
  if (customerNote.length > 500)
    throw new OrderError(
      422,
      "INVALID_NOTE",
      "Order note must be 500 characters or fewer.",
    );
  return {
    items,
    fulfilmentMethod: input.fulfilmentMethod,
    paymentMethod: input.paymentMethod,
    addressId: String(input.addressId || "").trim() || null,
    newAddress: input.newAddress || null,
    saveAddress: Boolean(input.saveAddress),
    customerNote: customerNote || null,
  };
}

async function priceItems(client, requested, charge = 0) {
  const keys = [...new Set(requested.map((item) => item.productId))];
  const products = await client.product.findMany({
    where: {
      OR: [
        { id: { in: keys } },
        { slug: { in: keys } },
        { legacyId: { in: keys.filter((x) => /^\d+$/.test(x)).map(Number) } },
      ],
    },
    include: {
      brand: true,
      category: true,
      variants: {
        include: {
          combinations: {
            include: {
              colour: true,
              images: { orderBy: { displayOrder: "asc" } },
            },
          },
        },
      },
    },
  });
  const resolved = new Map();
  for (const item of requested) {
    const product = products.find(
      (p) =>
        (p.id === item.productId ||
          p.slug === item.productId ||
          String(p.legacyId) === item.productId) &&
        (!item.productType || p.productType === item.productType),
    );
    if (!product)
      throw new OrderError(
        404,
        "PRODUCT_NOT_FOUND",
        "One or more products no longer exist.",
        { productId: item.productId },
      );
    const hasVariants = product.variants.length > 0;
    if (hasVariants && (!item.productVariantId || !item.productVariantColourId))
      throw new OrderError(
        422,
        "VARIANT_REQUIRED",
        `Select RAM, storage and colour for ${product.name}.`,
      );
    const variant = hasVariants
      ? product.variants.find((v) => v.id === item.productVariantId)
      : null;
    const combination = variant?.combinations.find(
      (c) => c.id === item.productVariantColourId,
    );
    if (
      hasVariants &&
      (!variant?.isActive ||
        !combination?.isActive ||
        !combination.colour.isActive)
    )
      throw new OrderError(
        409,
        "VARIANT_UNAVAILABLE",
        `The selected ${product.name} combination is unavailable.`,
      );
    const lineKey = combination?.id || product.id;
    const current = resolved.get(lineKey);
    resolved.set(lineKey, {
      product,
      variant,
      combination,
      quantity: (current?.quantity || 0) + item.quantity,
    });
  }
  const lines = [...resolved.values()];
  for (const line of lines) {
    if (!line.product.isActive)
      throw new OrderError(
        409,
        "PRODUCT_UNAVAILABLE",
        `${line.product.name} is unavailable.`,
        { productId: line.product.id },
      );
    if (line.quantity > 10)
      throw new OrderError(
        422,
        "INVALID_QUANTITY",
        `Maximum quantity for ${line.product.name} is 10.`,
      );
    const available = line.combination
      ? line.combination.stock - line.combination.reservedStock
      : line.product.stock - line.product.reservedStock;
    if (available < line.quantity)
      throw new OrderError(
        409,
        "INSUFFICIENT_STOCK",
        `Only ${available} unit(s) of ${line.product.name} are available.`,
        { productId: line.product.id, available, requested: line.quantity },
      );
    line.availableStock = available;
    line.unitPrice = money(line.combination?.price ?? line.product.price);
    line.lineTotal = line.unitPrice.mul(line.quantity);
  }
  const subtotal = lines.reduce(
    (sum, line) => sum.add(line.lineTotal),
    money(0),
  );
  const deliveryCharge = money(charge),
    discount = money(0),
    tax = money(0);
  return {
    lines,
    subtotal,
    deliveryCharge,
    discount,
    tax,
    total: subtotal.add(deliveryCharge).sub(discount).add(tax),
  };
}

export function mapOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    fulfilmentMethod: order.fulfilmentMethod,
    subtotal: cash(order.subtotal),
    deliveryCharge: cash(order.deliveryCharge),
    discount: cash(order.discount),
    tax: cash(order.tax),
    total: cash(order.total),
    currency: order.currency,
    customerName: order.fullName,
    customerEmail: order.customerEmail,
    customerPhone: order.phone,
    address:
      order.fulfilmentMethod === "DELIVERY"
        ? {
            label: order.addressLabel,
            recipientName: order.recipientName,
            phone: order.shippingPhone,
            addressLine1: order.addressLine1,
            addressLine2: order.addressLine2,
            landmark: order.landmark,
            city: order.city,
            state: order.state,
            postalCode: order.postalCode,
            country: order.country,
          }
        : null,
    customerNote: order.customerNote,
    cancellationReason:
      order.status === "CANCELLED" ? order.cancellationReason : null,
    confirmedAt: order.confirmedAt,
    packedAt: order.packedAt,
    readyForPickupAt: order.readyForPickupAt,
    outForDeliveryAt: order.outForDeliveryAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
    placedAt: order.placedAt,
    updatedAt: order.updatedAt,
    delivery: {
      type: order.deliveryType,
      zone: order.deliveryZone,
      distanceKm: order.deliveryDistanceKm
        ? Number(order.deliveryDistanceKm)
        : null,
      shippingChargeStatus: order.shippingChargeStatus,
      status: order.deliveryStatus,
      sameDayEligible: order.sameDayEligible,
      sameDayReasonCode: order.sameDayReasonCode,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      courierName: order.courierName,
      trackingNumber: order.courierTrackingNumber,
      trackingUrl: order.courierTrackingUrl,
      publicNote: order.deliveryPublicNote,
      history:
        order.deliveryStatusHistory?.map((h) => ({
          status: h.toStatus,
          note: h.note,
          createdAt: h.createdAt,
        })) || [],
    },
    items:
      order.items?.map((i) => ({
        id: i.id,
        productId: i.productId,
        productVariantId: i.productVariantId,
        productVariantColourId: i.productVariantColourId,
        productSlug: i.productSlug,
        productName: i.productName,
        productType: i.productType,
        brandName: i.brandName,
        categoryName: i.categoryName,
        imageUrl: i.imageUrl,
        specifications: i.specifications,
        ram: i.ram,
        storage: i.storage,
        colourName: i.colourName,
        sku: i.variantSku || i.productSku,
        unitPrice: cash(i.unitPrice),
        originalPrice: i.originalPrice ? cash(i.originalPrice) : null,
        quantity: i.quantity,
        lineTotal: cash(i.lineTotal),
      })) || [],
    statusHistory:
      order.statusHistory
        ?.filter((h) => h.isCustomerVisible !== false)
        .map((h) => ({
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          note: h.note,
          createdAt: h.createdAt,
        })) || [],
    deliveryNotice:
      order.fulfilmentMethod === "DELIVERY"
        ? order.shippingChargeStatus === "PENDING_CONFIRMATION"
          ? "Shipping charge will be confirmed by phone before payment or dispatch."
          : `Delivery charge: ₹${cash(order.deliveryCharge)}`
        : null,
  };
}

export async function quoteOrder(userId, input) {
  const data = validate(input, false);
  let address = null;
  if (data.fulfilmentMethod === "DELIVERY") {
    if (data.addressId) address = await getOwnedAddress(userId, data.addressId);
    else if (data.newAddress) address = validateAddress(data.newAddress);
    else
      throw new OrderError(
        422,
        "ADDRESS_REQUIRED",
        "A delivery address is required.",
      );
  }
  const delivery = await previewDelivery({
    address,
    fulfilmentMethod: data.fulfilmentMethod,
  });
  const pricing = await priceItems(prisma, data.items, delivery.deliveryCharge);
  return {
    items: pricing.lines.map(
      ({ product, variant, combination, quantity, unitPrice, lineTotal }) => ({
        productId: product.id,
        productVariantId: variant?.id || null,
        productVariantColourId: combination?.id || null,
        name: product.name,
        ram: variant?.ram || null,
        storage: variant?.storage || null,
        colourName: combination?.colour.name || null,
        sku: combination?.sku || product.sku,
        imageUrl:
          (
            combination?.images.find((image) => image.isPrimary) ||
            combination?.images[0]
          )?.imageUrl || product.imageUrl,
        quantity,
        unitPrice: cash(unitPrice),
        lineTotal: cash(lineTotal),
        stockAvailable: true,
      }),
    ),
    subtotal: cash(pricing.subtotal),
    deliveryCharge: delivery.requiresConfirmation
      ? null
      : cash(pricing.deliveryCharge),
    discount: cash(pricing.discount),
    tax: cash(pricing.tax),
    total: delivery.requiresConfirmation
      ? cash(pricing.subtotal)
      : cash(pricing.total),
    delivery,
    warnings: [delivery.message],
  };
}

const orderNumber = () => {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `TCS-${date}-${crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase()}`;
};
export async function createOrder(user, input, headerKey) {
  const data = validate(input, true);
  const key = String(headerKey || input.idempotencyKey || "").trim();
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(key))
    throw new OrderError(
      422,
      "INVALID_IDEMPOTENCY_KEY",
      "A valid idempotency key is required.",
    );
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");
  const existing = await prisma.order.findUnique({
    where: { userId_idempotencyKey: { userId: user.id, idempotencyKey: key } },
    include: includeOrder,
  });
  if (existing) {
    if (existing.requestHash !== hash)
      throw new OrderError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "This idempotency key was already used for a different order.",
      );
    return { order: mapOrder(existing), created: false };
  }
  for (let attempt = 0; attempt < 3; attempt++)
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const duplicate = await tx.order.findUnique({
            where: {
              userId_idempotencyKey: { userId: user.id, idempotencyKey: key },
            },
            include: includeOrder,
          });
          if (duplicate) {
            if (duplicate.requestHash !== hash)
              throw new OrderError(
                409,
                "IDEMPOTENCY_CONFLICT",
                "This idempotency key was already used for a different order.",
              );
            return { order: duplicate, created: false };
          }
          let address = null;
          if (data.fulfilmentMethod === "DELIVERY") {
            if (data.addressId)
              address = await getOwnedAddress(user.id, data.addressId, tx);
            else if (data.newAddress)
              address = validateAddress(data.newAddress);
            else
              throw new OrderError(
                422,
                "ADDRESS_REQUIRED",
                "A delivery address is required.",
              );
            if (data.saveAddress && !data.addressId) {
              const count = await tx.address.count({
                where: { userId: user.id },
              });
              const makeDefault = count === 0 || address.isDefault;
              if (makeDefault)
                await tx.address.updateMany({
                  where: { userId: user.id, isDefault: true },
                  data: { isDefault: false },
                });
              address = await tx.address.create({
                data: { ...address, isDefault: makeDefault, userId: user.id },
              });
            }
          }
          const delivery = await previewDelivery(
              { address, fulfilmentMethod: data.fulfilmentMethod },
              tx,
            ),
            pricing = await priceItems(tx, data.items, delivery.deliveryCharge),
            managerId = await findSoleDeliveryManager(tx),
            deliveryStatus = initialDeliveryStatus(delivery, managerId);
          const online = data.paymentMethod === "ONLINE",
            awaitingShipping = delivery.requiresConfirmation,
            initialStatus = awaitingShipping
              ? "PENDING_CONFIRMATION"
              : online
                ? "PENDING_PAYMENT"
                : "PENDING_CONFIRMATION";
          const created = await tx.order.create({
            data: {
              orderNumber: orderNumber(),
              userId: user.id,
              fullName: user.name,
              phone: address?.phone || user.phone || "",
              address: address?.addressLine1 || "Store Pickup",
              city: address?.city || "Vapi",
              postalCode: address?.postalCode || "396195",
              total: pricing.total,
              status: initialStatus,
              paymentStatus: "PENDING",
              paymentMethod: data.paymentMethod,
              fulfilmentMethod: data.fulfilmentMethod,
              subtotal: pricing.subtotal,
              deliveryCharge: pricing.deliveryCharge,
              discount: pricing.discount,
              tax: pricing.tax,
              customerEmail: user.email || "",
              addressLabel: address?.label,
              recipientName: address?.recipientName,
              shippingPhone: address?.phone,
              addressLine1: address?.addressLine1,
              addressLine2: address?.addressLine2,
              landmark: address?.landmark,
              state: address?.state,
              country: address?.country,
              customerNote: data.customerNote,
              internalNote: awaitingShipping
                ? "Shipping charge confirmation required."
                : null,
              idempotencyKey: key,
              requestHash: hash,
              deliveryType: delivery.deliveryType,
              deliveryZone: delivery.deliveryZone,
              deliveryDistanceKm: delivery.distanceKm,
              shippingChargeStatus: delivery.shippingChargeStatus,
              deliveryStatus,
              deliveryManagerId: managerId,
              sameDayEligible: delivery.sameDayEligible,
              sameDayReasonCode: delivery.sameDayReasonCode,
              deliveryAddressSnapshot: address
                ? JSON.parse(JSON.stringify(address))
                : undefined,
              items: {
                create: pricing.lines.map(
                  ({
                    product,
                    variant,
                    combination,
                    quantity,
                    unitPrice,
                    lineTotal,
                  }) => ({
                    productId: product.id,
                    productVariantId: variant?.id,
                    productVariantColourId: combination?.id,
                    name: product.name,
                    price: unitPrice,
                    quantity,
                    productSlug: product.slug,
                    productName: product.name,
                    productSku: combination?.sku || product.sku,
                    productType: product.productType,
                    brandName: product.brand.name,
                    categoryName: product.category.name,
                    imageUrl:
                      (
                        combination?.images.find((image) => image.isPrimary) ||
                        combination?.images[0]
                      )?.imageUrl || product.imageUrl,
                    specifications: product.specifications ?? undefined,
                    ram: variant?.ram,
                    storage: variant?.storage,
                    colourName: combination?.colour.name,
                    variantSku: combination?.sku,
                    unitPrice,
                    originalPrice: product.originalPrice,
                    lineTotal,
                  }),
                ),
              },
              statusHistory: {
                create: {
                  toStatus: initialStatus,
                  actorUserId: user.id,
                  actorType: "CUSTOMER",
                  note: awaitingShipping
                    ? "Order placed; shipping confirmation pending."
                    : online
                      ? "Order created; online payment pending."
                      : "Order placed by customer.",
                },
              },
              deliveryStatusHistory: {
                create: {
                  toStatus: deliveryStatus,
                  actorUserId: user.id,
                  actorType: "SYSTEM",
                  note: delivery.message,
                },
              },
            },
          });
          for (const line of pricing.lines) {
            const reserve = online && !awaitingShipping;
            const updated = line.combination
              ? await tx.productVariantColour.updateMany({
                  where: {
                    id: line.combination.id,
                    stock: line.combination.stock,
                    reservedStock: line.combination.reservedStock,
                    isActive: true,
                  },
                  data: reserve
                    ? { reservedStock: { increment: line.quantity } }
                    : { stock: { decrement: line.quantity } },
                })
              : await tx.product.updateMany({
                  where: {
                    id: line.product.id,
                    stock: line.product.stock,
                    reservedStock: line.product.reservedStock,
                  },
                  data: reserve
                    ? { reservedStock: { increment: line.quantity } }
                    : { stock: { decrement: line.quantity } },
                });
            if (updated.count !== 1)
              throw new OrderError(
                409,
                "INSUFFICIENT_STOCK",
                `${line.product.name} sold out while placing the order.`,
                { productId: line.product.id },
              );
            if (reserve)
              await tx.inventoryReservation.create({
                data: {
                  orderId: created.id,
                  productId: line.product.id,
                  variantColourId: line.combination?.id,
                  quantity: line.quantity,
                  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                },
              });
            else
              await tx.inventoryMovement.create({
                data: {
                  productId: line.product.id,
                  variantColourId: line.combination?.id,
                  quantityChange: -line.quantity,
                  previousStock: line.combination?.stock ?? line.product.stock,
                  newStock:
                    (line.combination?.stock ?? line.product.stock) -
                    line.quantity,
                  reason: "ORDER_DEDUCTION",
                  referenceType: "ORDER",
                  referenceId: created.id,
                  note: `Order ${created.orderNumber}`,
                },
              });
          }
          return {
            order: await tx.order.findUnique({
              where: { id: created.id },
              include: includeOrder,
            }),
            created: true,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 15000,
        },
      );
      return { order: mapOrder(result.order), created: result.created };
    } catch (error) {
      if (error instanceof OrderError) throw error;
      if (error?.code === "P2034" || error?.code === "P2002") {
        if (attempt < 2) continue;
      }
      throw error;
    }
}
export async function listOrders(userId, query = {}) {
  const page = Math.max(1, Number(query.page) || 1),
    pageSize = Math.min(20, Math.max(1, Number(query.pageSize) || 10));
  const statuses = [
    "PENDING",
    "PENDING_PAYMENT",
    "PENDING_CONFIRMATION",
    "CONFIRMED",
    "PROCESSING",
    "PACKED",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "FAILED",
    "REFUNDED",
  ];
  if (
    query.status &&
    query.status !== "ALL" &&
    !statuses.includes(query.status)
  )
    throw new OrderError(422, "INVALID_STATUS", "Invalid order status filter.");
  const where = {
    userId,
    ...(query.status && query.status !== "ALL" ? { status: query.status } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: {
        items: true,
        statusHistory: {
          where: { isCustomerVisible: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  return {
    orders: rows.map(mapOrder),
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
  };
}
export async function getOrder(userId, identifier) {
  const order = await prisma.order.findFirst({
    where: { userId, OR: [{ id: identifier }, { orderNumber: identifier }] },
    include: includeOrder,
  });
  if (!order) throw new OrderError(404, "ORDER_NOT_FOUND", "Order not found.");
  return mapOrder(order);
}
