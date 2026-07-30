import { prisma } from "@/lib/prisma";
export class CustomerError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    Object.assign(this, { status, code, fields });
  }
}
const safe = {
  id: true,
  name: true,
  email: true,
  phone: true,
  status: true,
  createdAt: true,
  lastLoginAt: true,
  lastPasswordChangedAt: true,
  suspendedAt: true,
  suspendedReason: true,
};
export async function listCustomers(q = {}) {
  const page = Math.max(1, Number(q.page) || 1),
    limit = Math.min(50, Math.max(1, Number(q.limit) || 20)),
    search = String(q.search || "")
      .trim()
      .slice(0, 100),
    where = {
      role: "CUSTOMER",
      ...(search
        ? {
            OR: ["name", "email", "phone"].map((k) => ({
              [k]: { contains: search, mode: "insensitive" },
            })),
          }
        : {}),
      ...(q.status &&
      q.status !== "ALL" &&
      ["ACTIVE", "SUSPENDED", "LOCKED"].includes(q.status)
        ? { status: q.status }
        : {}),
      ...(q.registeredFrom || q.registeredTo
        ? {
            createdAt: {
              ...(q.registeredFrom
                ? { gte: new Date(`${q.registeredFrom}T00:00:00Z`) }
                : {}),
              ...(q.registeredTo
                ? { lte: new Date(`${q.registeredTo}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),
      ...(q.hasOrders === "true"
        ? { orders: { some: {} } }
        : q.hasOrders === "false"
          ? { orders: { none: {} } }
          : {}),
    };
  let orderBy = { createdAt: "desc" };
  if (q.sort === "oldest") orderBy = { createdAt: "asc" };
  if (q.sort === "name-asc") orderBy = { name: "asc" };
  if (q.sort === "name-desc") orderBy = { name: "desc" };
  if (q.sort === "recently-active")
    orderBy = { lastLoginAt: { sort: "desc", nulls: "last" } };
  if (q.sort === "most-orders") orderBy = { orders: { _count: "desc" } };
  const [rows, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        ...safe,
        _count: {
          select: { orders: true, wishlistItems: true, enquiries: true },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  return {
    customers: rows.map((x) => ({ ...x, counts: x._count, _count: undefined })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
export async function customerDetail(id) {
  const user = await prisma.user.findFirst({
    where: { id, role: "CUSTOMER" },
    select: {
      ...safe,
      _count: {
        select: {
          orders: true,
          addresses: true,
          wishlistItems: true,
          enquiries: true,
          sessions: {
            where: { revokedAt: null, expiresAt: { gt: new Date() } },
          },
        },
      },
      orders: {
        orderBy: { placedAt: "desc" },
        take: 5,
        select: {
          orderNumber: true,
          status: true,
          total: true,
          paymentStatus: true,
          placedAt: true,
        },
      },
      addresses: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        take: 3,
        select: {
          label: true,
          city: true,
          state: true,
          postalCode: true,
          isDefault: true,
        },
      },
      enquiries: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          enquiryNumber: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      },
      authEvents: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          eventType: true,
          success: true,
          deviceLabel: true,
          createdAt: true,
        },
      },
    },
  });
  if (!user)
    throw new CustomerError(404, "CUSTOMER_NOT_FOUND", "Customer not found.");
  const paid = await prisma.payment.aggregate({
    where: { userId: id, status: "PAID" },
    _sum: { amount: true },
    _count: true,
  });
  return {
    ...user,
    counts: user._count,
    paymentSummary: {
      successfulPayments: paid._count,
      totalPaid: paid._sum.amount || 0,
    },
    _count: undefined,
    securityEvents: user.authEvents.map((e) => ({
      ...e,
      deviceLabel: e.deviceLabel || "Unknown Device",
    })),
    authEvents: undefined,
    allowedActions: user.status === "SUSPENDED" ? ["ACTIVATE"] : ["SUSPEND"],
  };
}
export async function changeCustomerStatus(id, input, admin, meta = {}) {
  const allowed = ["status", "reason"];
  if (Object.keys(input || {}).some((k) => !allowed.includes(k)))
    throw new CustomerError(422, "UNKNOWN_FIELD", "Unsupported request field.");
  if (!["ACTIVE", "SUSPENDED"].includes(input?.status))
    throw new CustomerError(
      422,
      "INVALID_STATUS",
      "Status must be ACTIVE or SUSPENDED.",
    );
  if (id === admin.id)
    throw new CustomerError(
      409,
      "CUSTOMER_STATUS_CONFLICT",
      "You cannot change your own status here.",
    );
  const customer = await prisma.user.findFirst({
    where: { id, role: "CUSTOMER" },
  });
  if (!customer)
    throw new CustomerError(404, "CUSTOMER_NOT_FOUND", "Customer not found.");
  const reason = String(input.reason || "")
    .trim()
    .slice(0, 500);
  if (input.status === "SUSPENDED" && reason.length < 5)
    throw new CustomerError(
      422,
      "REASON_REQUIRED",
      "Provide a suspension reason of at least 5 characters.",
      { reason: "Suspension reason is required." },
    );
  const now = new Date(),
    eventType =
      input.status === "SUSPENDED"
        ? "ACCOUNT_SUSPENDED"
        : "ACCOUNT_REACTIVATED";
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        status: input.status,
        suspendedAt: input.status === "SUSPENDED" ? now : null,
        suspendedReason: input.status === "SUSPENDED" ? reason : null,
        lockedUntil: null,
        failedLoginCount: 0,
      },
    }),
    ...(input.status === "SUSPENDED"
      ? [
          prisma.session.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: now, revokeReason: "ACCOUNT_SUSPENDED" },
          }),
        ]
      : []),
    prisma.authEvent.create({
      data: {
        userId: id,
        emailNormalized: customer.email || customer.phone || "",
        eventType,
        success: true,
        deviceLabel: "Administrative action",
        ipHash: meta.ipHash || null,
      },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: eventType,
        entityType: "User",
        entityId: id,
        metadata: { reason: reason || "Reactivated" },
      },
    }),
  ]);
  return customerDetail(id);
}
export async function customerStats() {
  const now = new Date(),
    today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const [active, newToday, newMonth, suspended, withOrders, recent] =
    await prisma.$transaction([
      prisma.user.count({ where: { role: "CUSTOMER", status: "ACTIVE" } }),
      prisma.user.count({
        where: { role: "CUSTOMER", createdAt: { gte: today } },
      }),
      prisma.user.count({
        where: { role: "CUSTOMER", createdAt: { gte: month } },
      }),
      prisma.user.count({ where: { role: "CUSTOMER", status: "SUSPENDED" } }),
      prisma.user.count({ where: { role: "CUSTOMER", orders: { some: {} } } }),
      prisma.user.findMany({
        where: { role: "CUSTOMER" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);
  return { active, newToday, newMonth, suspended, withOrders, recent };
}
