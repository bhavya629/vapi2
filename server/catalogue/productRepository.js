import { prisma } from "@/lib/prisma";

export const publicProductSelect = {
  id: true,
  legacyId: true,
  slug: true,
  sku: true,
  name: true,
  shortDescription: true,
  description: true,
  productType: true,
  price: true,
  originalPrice: true,
  stock: true,
  reservedStock: true,
  lowStockThreshold: true,
  imageUrl: true,
  specifications: true,
  compatibility: true,
  rating: true,
  reviewCount: true,
  averageRating: true,
  totalReviews: true,
  rating1: true,
  rating2: true,
  rating3: true,
  rating4: true,
  rating5: true,
  isFeatured: true,
  displayOrder: true,
  brand: { select: { name: true, slug: true, logoUrl: true } },
  category: { select: { name: true, slug: true } },
  images: {
    select: { imageUrl: true, altText: true, isPrimary: true },
    orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
  },
  colours: {
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      hexCode: true,
      isDefault: true,
      displayOrder: true,
    },
    orderBy: { displayOrder: "asc" },
  },
  variants: {
    where: { isActive: true },
    select: {
      id: true,
      ram: true,
      storage: true,
      isDefault: true,
      displayOrder: true,
      combinations: {
        where: { isActive: true, colour: { isActive: true } },
        select: {
          id: true,
          productColourId: true,
          sku: true,
          price: true,
          originalPrice: true,
          stock: true,
          reservedStock: true,
          lowStockThreshold: true,
          isDefault: true,
          displayOrder: true,
          colour: {
            select: {
              id: true,
              name: true,
              slug: true,
              hexCode: true,
              isDefault: true,
              displayOrder: true,
            },
          },
          images: {
            select: {
              id: true,
              imageUrl: true,
              altText: true,
              imageType: true,
              isPrimary: true,
              displayOrder: true,
            },
            orderBy: { displayOrder: "asc" },
          },
          specifications: {
            select: { id: true, key: true, value: true, displayOrder: true },
            orderBy: { displayOrder: "asc" },
          },
        },
        orderBy: { displayOrder: "asc" },
      },
    },
    orderBy: { displayOrder: "asc" },
  },
};

export async function findPublicProducts({ where, orderBy, skip, take }) {
  return prisma.$transaction([
    prisma.product.findMany({
      where,
      select: publicProductSelect,
      orderBy,
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);
}

export function findPublicProduct(identifier, productType) {
  const numeric = /^\d+$/.test(identifier) ? Number(identifier) : null;
  return prisma.product.findFirst({
    where: {
      isActive: true,
      ...(productType ? { productType } : {}),
      OR: [
        { slug: identifier },
        { id: identifier },
        ...(numeric !== null ? [{ legacyId: numeric }] : []),
      ],
    },
    select: publicProductSelect,
  });
}
