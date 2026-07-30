import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
export class ReviewError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    Object.assign(this, { status, code, fields });
  }
}
const clean = (v, max) =>
    String(v || "")
      .replace(/\0/g, "")
      .trim()
      .slice(0, max),
  statuses = ["PENDING", "APPROVED", "REJECTED", "HIDDEN"];
async function productFor(identifier, tx = prisma) {
  const key = clean(identifier, 150),
    or = [{ id: key }, { slug: key }];
  if (/^\d+$/.test(key)) or.push({ legacyId: Number(key) });
  const product = await tx.product.findFirst({ where: { OR: or } });
  if (!product)
    throw new ReviewError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  return product;
}
function validate(input) {
  const rating = Number(input?.rating),
    title = clean(input?.title, 100),
    comment = clean(input?.comment, 2000),
    fields = {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    fields.rating = "Choose a rating from 1 to 5.";
  if (title.length < 5) fields.title = "Title must contain 5–100 characters.";
  if (comment.length < 20)
    fields.comment = "Review must contain 20–2000 characters.";
  if (Object.keys(fields).length)
    throw new ReviewError(
      422,
      "VALIDATION_ERROR",
      "Please correct the highlighted fields.",
      fields,
    );
  return { rating, title, comment };
}
async function recalculate(tx, productId) {
  const groups = await tx.review.groupBy({
      by: ["rating"],
      where: { productId, status: "APPROVED" },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    counts = Object.fromEntries(groups.map((x) => [x.rating, x._count._all])),
    total = groups.reduce((n, x) => n + x._count._all, 0),
    sum = groups.reduce((n, x) => n + x.rating * x._count._all, 0),
    average = total ? sum / total : 0;
  await tx.product.update({
    where: { id: productId },
    data: {
      averageRating: new Prisma.Decimal(average.toFixed(2)),
      totalReviews: total,
      rating1: counts[1] || 0,
      rating2: counts[2] || 0,
      rating3: counts[3] || 0,
      rating4: counts[4] || 0,
      rating5: counts[5] || 0,
      rating: new Prisma.Decimal(average.toFixed(1)),
      reviewCount: total,
    },
  });
}
const publicSelect = {
  id: true,
  rating: true,
  title: true,
  comment: true,
  verifiedPurchase: true,
  helpfulCount: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true } },
};
const map = (r) => ({
  ...r,
  user: {
    name: r.user.name,
    initials: r.user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase(),
  },
});
export async function productReviews(identifier, q = {}, userId) {
  const product = await productFor(identifier),
    page = Math.max(1, Number(q.page) || 1),
    limit = Math.min(20, Math.max(1, Number(q.limit) || 5)),
    sort = q.sort || "newest",
    orderBy =
      sort === "oldest"
        ? { createdAt: "asc" }
        : sort === "highest"
          ? { rating: "desc" }
          : sort === "lowest"
            ? { rating: "asc" }
            : sort === "helpful"
              ? { helpfulCount: "desc" }
              : { createdAt: "desc" };
  const [rows, total, own] = await prisma.$transaction([
    prisma.review.findMany({
      where: { productId: product.id, status: "APPROVED" },
      select: publicSelect,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({
      where: { productId: product.id, status: "APPROVED" },
    }),
    userId
      ? prisma.review.findUnique({
          where: { userId_productId: { userId, productId: product.id } },
          select: {
            id: true,
            status: true,
            rating: true,
            title: true,
            comment: true,
            verifiedPurchase: true,
          },
        })
      : prisma.review.findFirst({ where: { id: "__none__" } }),
  ]);
  return {
    product: {
      id: product.id,
      name: product.name,
      averageRating: Number(product.averageRating),
      totalReviews: product.totalReviews,
      distribution: {
        1: product.rating1,
        2: product.rating2,
        3: product.rating3,
        4: product.rating4,
        5: product.rating5,
      },
    },
    reviews: rows.map(map),
    eligibility: {
      authenticated: Boolean(userId),
      verifiedPurchase: Boolean(own?.verifiedPurchase),
      canReview: Boolean(userId && !own),
      ownReview: own,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
export async function createReview(userId, input) {
  const data = validate(input),
    product = await productFor(input?.productId),
    order = await prisma.order.findFirst({
      where: {
        userId,
        status: "DELIVERED",
        paymentStatus: "PAID",
        items: { some: { productId: product.id } },
      },
      orderBy: { deliveredAt: "desc" },
      select: { id: true },
    });
  try {
    return await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          ...data,
          productId: product.id,
          userId,
          orderId: order?.id || null,
          verifiedPurchase: Boolean(order),
          status: "APPROVED",
        },
        select: {
          id: true,
          status: true,
          rating: true,
          title: true,
          comment: true,
          createdAt: true,
        },
      });
      await recalculate(tx, product.id);
      return review;
    });
  } catch (e) {
    if (e.code === "P2002")
      throw new ReviewError(
        409,
        "REVIEW_EXISTS",
        "You have already reviewed this product.",
      );
    throw e;
  }
}
export async function updateOwn(userId, id, input) {
  const data = validate(input);
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.findFirst({ where: { id, userId } });
    if (!review)
      throw new ReviewError(404, "REVIEW_NOT_FOUND", "Review not found.");
    const updated = await tx.review.update({
      where: { id },
      data: {
        ...data,
        status: ["HIDDEN", "REJECTED"].includes(review.status)
          ? "PENDING"
          : "APPROVED",
      },
    });
    await recalculate(tx, review.productId);
    return updated;
  });
}
export async function deleteOwn(userId, id) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.findFirst({ where: { id, userId } });
    if (!review)
      throw new ReviewError(404, "REVIEW_NOT_FOUND", "Review not found.");
    await tx.review.delete({ where: { id } });
    await recalculate(tx, review.productId);
    return { deleted: true };
  });
}
export async function voteReview(userId, id, helpful = true) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.findFirst({
      where: { id, status: "APPROVED" },
    });
    if (!review)
      throw new ReviewError(404, "REVIEW_NOT_FOUND", "Review not found.");
    if (review.userId === userId)
      throw new ReviewError(
        409,
        "OWN_REVIEW_VOTE",
        "You cannot vote on your own review.",
      );
    await tx.reviewVote.upsert({
      where: { reviewId_userId: { reviewId: id, userId } },
      create: { reviewId: id, userId, helpful: Boolean(helpful) },
      update: { helpful: Boolean(helpful) },
    });
    const count = await tx.reviewVote.count({
      where: { reviewId: id, helpful: true },
    });
    await tx.review.update({ where: { id }, data: { helpfulCount: count } });
    return { helpfulCount: count, helpful: Boolean(helpful) };
  });
}
export async function reportReview(userId, id, reason) {
  const message = clean(reason, 500);
  if (message.length < 5)
    throw new ReviewError(
      422,
      "INVALID_REPORT",
      "Report reason must contain 5–500 characters.",
    );
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.findFirst({
      where: { id, status: "APPROVED" },
    });
    if (!review)
      throw new ReviewError(404, "REVIEW_NOT_FOUND", "Review not found.");
    if (review.userId === userId)
      throw new ReviewError(
        409,
        "OWN_REVIEW_REPORT",
        "You cannot report your own review.",
      );
    try {
      await tx.reviewReport.create({
        data: { reviewId: id, userId, reason: message },
      });
    } catch (e) {
      if (e.code !== "P2002") throw e;
    }
    const count = await tx.reviewReport.count({ where: { reviewId: id } });
    await tx.review.update({ where: { id }, data: { reportCount: count } });
    return { reported: true };
  });
}
export async function ownReviews(userId, q = {}) {
  const page = Math.max(1, Number(q.page) || 1),
    limit = 10,
    [rows, total] = await prisma.$transaction([
      prisma.review.findMany({
        where: { userId },
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              imageUrl: true,
              productType: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where: { userId } }),
    ]);
  return {
    reviews: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
export async function adminReviews(q = {}) {
  const page = Math.max(1, Number(q.page) || 1),
    limit = Math.min(50, Math.max(1, Number(q.limit) || 20)),
    search = clean(q.search, 100),
    where = {
      ...(q.status && q.status !== "ALL" && statuses.includes(q.status)
        ? { status: q.status }
        : {}),
      ...(q.rating && Number(q.rating) >= 1
        ? { rating: Number(q.rating) }
        : {}),
      ...(q.verified === "true"
        ? { verifiedPurchase: true }
        : q.verified === "false"
          ? { verifiedPurchase: false }
          : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { comment: { contains: search, mode: "insensitive" } },
              { product: { name: { contains: search, mode: "insensitive" } } },
              { user: { name: { contains: search, mode: "insensitive" } } },
              { user: { email: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(q.product
        ? {
            product: {
              name: { contains: clean(q.product, 100), mode: "insensitive" },
            },
          }
        : {}),
      ...(q.customer
        ? {
            user: {
              OR: [
                {
                  name: {
                    contains: clean(q.customer, 100),
                    mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: clean(q.customer, 100),
                    mode: "insensitive",
                  },
                },
              ],
            },
          }
        : {}),
      ...(q.dateFrom || q.dateTo
        ? {
            createdAt: {
              ...(q.dateFrom
                ? { gte: new Date(`${q.dateFrom}T00:00:00Z`) }
                : {}),
              ...(q.dateTo
                ? { lte: new Date(`${q.dateTo}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),
    };
  const [rows, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, email: true } },
        order: { select: { orderNumber: true } },
      },
      orderBy:
        q.sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);
  return {
    reviews: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
export async function adminDetail(id) {
  const row = await prisma.review.findUnique({
    where: { id },
    include: {
      product: {
        select: { id: true, name: true, slug: true, productType: true },
      },
      user: { select: { id: true, name: true, email: true } },
      order: {
        select: { orderNumber: true, status: true, paymentStatus: true },
      },
      votes: { select: { id: true } },
      reports: { select: { id: true, reason: true, createdAt: true } },
    },
  });
  if (!row) throw new ReviewError(404, "REVIEW_NOT_FOUND", "Review not found.");
  return row;
}
export async function moderate(id, input, adminId) {
  const allowed = ["status"];
  if (
    Object.keys(input || {}).some((k) => !allowed.includes(k)) ||
    !statuses.includes(input?.status)
  )
    throw new ReviewError(
      422,
      "INVALID_STATUS",
      "Select a valid review status.",
    );
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.findUnique({ where: { id } });
    if (!review)
      throw new ReviewError(404, "REVIEW_NOT_FOUND", "Review not found.");
    const updated = await tx.review.update({
      where: { id },
      data: { status: input.status },
    });
    await recalculate(tx, review.productId);
    await tx.adminAuditLog.create({
      data: {
        adminUserId: adminId,
        action: `REVIEW_${input.status}`,
        entityType: "Review",
        entityId: id,
      },
    });
    return updated;
  });
}
export async function adminDelete(id, adminId) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.findUnique({ where: { id } });
    if (!review)
      throw new ReviewError(404, "REVIEW_NOT_FOUND", "Review not found.");
    await tx.review.delete({ where: { id } });
    await recalculate(tx, review.productId);
    await tx.adminAuditLog.create({
      data: {
        adminUserId: adminId,
        action: "REVIEW_DELETED",
        entityType: "Review",
        entityId: id,
      },
    });
    return { deleted: true };
  });
}
export async function reviewStats() {
  const [pending, hidden, approved, avg, latest] = await prisma.$transaction([
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.review.count({ where: { status: "HIDDEN" } }),
    prisma.review.count({ where: { status: "APPROVED" } }),
    prisma.review.aggregate({
      where: { status: "APPROVED" },
      _avg: { rating: true },
    }),
    prisma.review.findMany({
      include: {
        product: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  return {
    pending,
    hidden,
    approved,
    averageRating: Number(avg._avg.rating || 0),
    latest,
  };
}
