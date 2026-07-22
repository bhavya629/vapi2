import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { generateEnquiryNumber } from "@/server/enquiries/enquiryNumber";
export class EnquiryError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    Object.assign(this, { status, code, fields });
  }
}
export const categories = [
    "GENERAL",
    "PRODUCT_INFORMATION",
    "STOCK_AVAILABILITY",
    "ORDER_SUPPORT",
    "PAYMENT_SUPPORT",
    "DELIVERY_SUPPORT",
    "CANCELLATION_REQUEST",
    "RETURN_OR_REFUND",
    "WARRANTY_SUPPORT",
    "WEBSITE_SUPPORT",
  "OTHER",
], sources = ["CONTACT_PAGE", "ACCOUNT", "ORDER_DETAIL", "GUEST"],
  statuses = [
    "OPEN",
    "IN_REVIEW",
    "WAITING_FOR_CUSTOMER",
    "WAITING_FOR_STORE",
    "RESOLVED",
    "CLOSED",
    "SPAM",
  ],
  priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
const transitions = {
  OPEN: ["IN_REVIEW", "WAITING_FOR_CUSTOMER", "RESOLVED", "SPAM", "CLOSED"],
  IN_REVIEW: [
    "WAITING_FOR_CUSTOMER",
    "WAITING_FOR_STORE",
    "RESOLVED",
    "CLOSED",
    "SPAM",
  ],
  WAITING_FOR_CUSTOMER: ["IN_REVIEW", "RESOLVED", "CLOSED"],
  WAITING_FOR_STORE: [
    "IN_REVIEW",
    "WAITING_FOR_CUSTOMER",
    "RESOLVED",
    "CLOSED",
  ],
  RESOLVED: ["CLOSED", "IN_REVIEW"],
  CLOSED: ["IN_REVIEW"],
  SPAM: ["CLOSED", "OPEN"],
};
export const allowedTransitions = (e) => transitions[e.status] || [];
const clean = (v, max) =>
    String(v || "")
      .replace(/\0/g, "")
      .replace(/\r\n/g, "\n")
      .trim()
      .slice(0, max),
  email = (v) => clean(v, 254).toLowerCase();
function validate(input) {
  const data = {
    name: clean(input.name, 100),
    email: email(input.email),
    phone: clean(input.phone, 20).replace(/[\s-]/g, "") || null,
    subject: clean(input.subject, 150),
    category: String(input.category || ""),
    message: clean(input.message, 3000),
    orderNumber: clean(input.orderNumber, 60) || null,
    website: clean(input.website, 100),
  };
  const fields = {};
  if (data.name.length < 2) fields.name = "Name must contain 2–100 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    fields.email = "Enter a valid email address.";
  if (data.phone && !/^(?:\+91)?[6-9]\d{9}$/.test(data.phone))
    fields.phone = "Enter a valid Indian phone number.";
  if (data.subject.length < 3)
    fields.subject = "Subject must contain 3–150 characters.";
  if (!categories.includes(data.category))
    fields.category = "Select a valid category.";
  if (data.message.length < 10)
    fields.message = "Message must contain 10–3000 characters.";
  if (Object.keys(fields).length)
    throw new EnquiryError(
      422,
      "VALIDATION_ERROR",
      "Please correct the highlighted fields.",
      fields,
    );
  return data;
}
const customerInclude = {
    order: { select: { orderNumber: true } },
    messages: {
      where: { isCustomerVisible: true },
      orderBy: { createdAt: "asc" },
    },
  },
  adminInclude = {
    user: { select: { id: true, name: true, email: true } },
    order: { select: { orderNumber: true, status: true } },
    messages: { orderBy: { createdAt: "asc" } },
  };
function customerDto(e) {
  return {
    enquiryNumber: e.enquiryNumber,
    subject: e.subject,
    category: e.category,
    status: e.status,
    priority: e.priority,
    orderNumber: e.order?.orderNumber || null,
    messages:
      e.messages?.map((m) => ({
        authorType: m.authorType,
        message: m.message,
        createdAt: m.createdAt,
      })) || [],
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    resolvedAt: e.resolvedAt,
    closedAt: e.closedAt,
    canReply: !["CLOSED", "SPAM"].includes(e.status),
  };
}
function adminDto(e) {
  return {
    ...customerDto(e),
    name: e.name,
    email: e.email,
    phone: e.phone,
    source: e.source,
    internalNote: e.internalNote,
    lastRespondedAt: e.lastRespondedAt,
    user: e.user,
    order: e.order,
    messages: e.messages,
    allowedTransitions: allowedTransitions(e),
  };
}
export async function createEnquiry(user, input) {
  const data = validate(input);
  if (data.website)
    return {
      enquiryNumber: `TCS-ENQ-${new Date().getFullYear()}-RECEIVED`,
      spam: true,
    };
  if (!user && data.orderNumber)
    throw new EnquiryError(
      422,
      "ORDER_NOT_ALLOWED",
      "Sign in to link an order.",
    );
  let order = null;
  if (data.orderNumber) {
    order = await prisma.order.findFirst({
      where: { orderNumber: data.orderNumber, userId: user.id },
    });
    if (!order)
      throw new EnquiryError(
        404,
        "ORDER_NOT_FOUND",
        "The selected order could not be found.",
      );
  }
  const priority = [
    "PAYMENT_SUPPORT",
    "CANCELLATION_REQUEST",
    "DELIVERY_SUPPORT",
  ].includes(data.category)
    ? "HIGH"
    : "NORMAL";
  for (let i = 0; i < 3; i++)
    try {
      const result = await prisma.enquiry.create({
        data: {
          enquiryNumber: generateEnquiryNumber(),
          userId: user?.id || null,
          orderId: order?.id || null,
          name: data.name,
          email: data.email,
          phone: data.phone,
          subject: data.subject,
          category: data.category,
          priority,
          source: user
            ? data.orderNumber
              ? "ORDER_DETAIL"
              : "ACCOUNT"
            : "GUEST",
          messages: {
            create: {
              authorUserId: user?.id || null,
              authorType: user ? "CUSTOMER" : "GUEST",
              message: data.message,
              isCustomerVisible: true,
            },
          },
        },
        include: customerInclude,
      });
      return customerDto(result);
    } catch (e) {
      if (e.code !== "P2002" || i === 2) throw e;
    }
}
export async function listCustomer(userId, q = {}) {
  const page = Math.max(1, Number(q.page) || 1),
    limit = Math.min(30, Math.max(1, Number(q.limit) || 10)),
    where = {
      userId,
      status: q.status && q.status !== "ALL" && statuses.includes(q.status) ? q.status : { not: "SPAM" },
    };
  const [rows, total] = await prisma.$transaction([
    prisma.enquiry.findMany({
      where,
      include: {
        order: { select: { orderNumber: true } },
        messages: {
          where: { isCustomerVisible: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: q.sort === "oldest" ? "asc" : "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.enquiry.count({ where }),
  ]);
  return {
    enquiries: rows.map(customerDto),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
export async function customerDetail(userId, n) {
  const e = await prisma.enquiry.findFirst({
    where: { userId, enquiryNumber: n, status: { not: "SPAM" } },
    include: customerInclude,
  });
  if (!e)
    throw new EnquiryError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.");
  return customerDto(e);
}
export async function customerReply(userId, n, input) {
  const message = clean(input?.message, 3000);
  if (message.length < 2)
    throw new EnquiryError(
      422,
      "INVALID_MESSAGE",
      "Message must contain 2–3000 characters.",
    );
  await prisma.$transaction(async (tx) => {
    const e = await tx.enquiry.findFirst({
      where: { userId, enquiryNumber: n },
    });
    if (!e)
      throw new EnquiryError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.");
    if (["CLOSED", "SPAM"].includes(e.status))
      throw new EnquiryError(
        409,
        "ENQUIRY_CLOSED",
        "This enquiry is closed. Please create a new enquiry if you still need help.",
      );
    const status = ["WAITING_FOR_CUSTOMER", "RESOLVED"].includes(e.status)
      ? "IN_REVIEW"
      : e.status;
    await tx.enquiryMessage.create({
      data: {
        enquiryId: e.id,
        authorUserId: userId,
        authorType: "CUSTOMER",
        message,
      },
    });
    await tx.enquiry.update({
      where: { id: e.id },
      data: {
        status,
        ...(e.status === "RESOLVED" ? { resolvedAt: null } : {}),
      },
    });
  });
  return customerDetail(userId, n);
}
export async function listAdmin(q = {}) {
  const page = Math.max(1, Number(q.page) || 1),
    limit = Math.min(50, Math.max(1, Number(q.limit) || 20)),
    search = clean(q.search, 100),
    where = {
      ...(search
        ? {
            OR: [
              ...["enquiryNumber", "name", "email", "phone", "subject"].map(
                (k) => ({ [k]: { contains: search, mode: "insensitive" } }),
              ),
              { order: { is: { orderNumber: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : {}),
      ...(q.status && q.status !== "ALL" && statuses.includes(q.status)
        ? { status: q.status }
        : {}),
      ...(q.category && q.category !== "ALL" && categories.includes(q.category)
        ? { category: q.category }
        : {}),
      ...(q.priority && q.priority !== "ALL" && priorities.includes(q.priority)
        ? { priority: q.priority }
        : {}),
      ...(q.source && q.source !== "ALL" && sources.includes(q.source) ? { source: q.source } : {}),
      ...(q.orderLinked === "true" ? { orderId: { not: null } } : q.orderLinked === "false" ? { orderId: null } : {}),
      ...(q.dateFrom || q.dateTo ? { createdAt: { ...(q.dateFrom ? { gte: new Date(`${q.dateFrom}T00:00:00.000Z`) } : {}), ...(q.dateTo ? { lte: new Date(`${q.dateTo}T23:59:59.999Z`) } : {}) } } : {}),
    };
  const [rows, total] = await prisma.$transaction([
    prisma.enquiry.findMany({
      where,
      include: {
        order: { select: { orderNumber: true } },
        _count: { select: { messages: true } },
      },
      orderBy: q.sort === "oldest" ? { createdAt: "asc" } : q.sort === "newest" ? { createdAt: "desc" } : q.sort === "priority" ? [{ priority: "desc" }, { updatedAt: "desc" }] : { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.enquiry.count({ where }),
  ]);
  return {
    enquiries: rows.map((e) => ({
      ...customerDto(e),
      name: e.name,
      email: e.email,
      phone: e.phone,
      source: e.source,
      messageCount: e._count.messages,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
export async function adminDetail(n) {
  const e = await prisma.enquiry.findUnique({
    where: { enquiryNumber: n },
    include: adminInclude,
  });
  if (!e)
    throw new EnquiryError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.");
  return adminDto(e);
}
export async function updateStatus(n, input, admin) {
  if (!statuses.includes(input?.status))
    throw new EnquiryError(422, "INVALID_STATUS", "Invalid enquiry status.");
  await prisma.$transaction(
    async (tx) => {
      const e = await tx.enquiry.findUnique({ where: { enquiryNumber: n } });
      if (!e)
        throw new EnquiryError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.");
      if (!allowedTransitions(e).includes(input.status))
        throw new EnquiryError(
          409,
          "INVALID_STATUS_TRANSITION",
          "This status transition is not allowed.",
        );
      const now = new Date();
      await tx.enquiry.update({
        where: { id: e.id },
        data: {
          status: input.status,
          resolvedAt:
            input.status === "RESOLVED"
              ? now
              : input.status === "IN_REVIEW"
                ? null
                : e.resolvedAt,
          closedAt:
            input.status === "CLOSED"
              ? now
              : input.status === "IN_REVIEW"
                ? null
                : e.closedAt,
        },
      });
      const note = clean(input.note, 1000);
      if (note)
        await tx.enquiryMessage.create({
          data: {
            enquiryId: e.id,
            authorUserId: admin.id,
            authorType: "SYSTEM",
            message: note,
            isCustomerVisible: input.customerVisible !== false,
          },
        });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  return adminDetail(n);
}
export async function updatePriority(n, p, admin) {
  if (!priorities.includes(p))
    throw new EnquiryError(422, "INVALID_PRIORITY", "Invalid priority.");
  const e = await prisma.enquiry.findUnique({ where: { enquiryNumber: n } });
  if (!e)
    throw new EnquiryError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.");
  await prisma.$transaction([
    prisma.enquiry.update({ where: { id: e.id }, data: { priority: p } }),
    prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "ENQUIRY_PRIORITY_UPDATED",
        entityType: "Enquiry",
        entityId: e.id,
        metadata: { priority: p },
      },
    }),
  ]);
  return adminDetail(n);
}
export async function adminMessage(n, input, admin) {
  const message = clean(input?.message, 3000);
  if (message.length < 2)
    throw new EnquiryError(
      422,
      "INVALID_MESSAGE",
      "Message must contain 2–3000 characters.",
    );
  const e = await prisma.enquiry.findUnique({ where: { enquiryNumber: n } });
  if (!e)
    throw new EnquiryError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.");
  await prisma.$transaction([
    prisma.enquiryMessage.create({
      data: {
        enquiryId: e.id,
        authorUserId: admin.id,
        authorType: "ADMIN",
        message,
        isCustomerVisible: input.customerVisible !== false,
      },
    }),
    prisma.enquiry.update({
      where: { id: e.id },
      data:
        input.customerVisible !== false ? { lastRespondedAt: new Date() } : {},
    }),
  ]);
  return adminDetail(n);
}
export async function internalNote(n, note, admin) {
  const e = await prisma.enquiry.findUnique({ where: { enquiryNumber: n } });
  if (!e)
    throw new EnquiryError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.");
  await prisma.$transaction([
    prisma.enquiry.update({
      where: { id: e.id },
      data: { internalNote: clean(note, 2000) },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "ENQUIRY_INTERNAL_NOTE_UPDATED",
        entityType: "Enquiry",
        entityId: e.id,
      },
    }),
  ]);
  return adminDetail(n);
}
export async function stats() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return {
    open: await prisma.enquiry.count({ where: { status: "OPEN" } }),
    inReview: await prisma.enquiry.count({ where: { status: "IN_REVIEW" } }),
    waitingCustomer: await prisma.enquiry.count({
      where: { status: "WAITING_FOR_CUSTOMER" },
    }),
    highPriority: await prisma.enquiry.count({
      where: {
        priority: { in: ["HIGH", "URGENT"] },
        status: { notIn: ["CLOSED", "RESOLVED", "SPAM"] },
      },
    }),
    newToday: await prisma.enquiry.count({
      where: { createdAt: { gte: start } },
    }),
    resolvedToday: await prisma.enquiry.count({
      where: { resolvedAt: { gte: start } },
    }),
    recent: await prisma.enquiry.findMany({
      select: {
        enquiryNumber: true,
        subject: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  };
}
