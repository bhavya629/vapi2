import { prisma } from "@/lib/prisma";

export function findPublicCategories(productType) {
  const productWhere = { isActive: true, ...(productType ? { productType } : {}) };
  return prisma.category.findMany({
    where: { isActive: true, ...(productType ? { productType } : {}), products: { some: productWhere } },
    select: { id: true, name: true, slug: true, description: true, imageUrl: true, productType: true, _count: { select: { products: { where: productWhere } } } },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
}
