import { prisma } from "@/lib/prisma";

export function findPublicBrands(productType) {
  const productWhere = { isActive: true, ...(productType ? { productType } : {}) };
  return prisma.brand.findMany({
    where: { isActive: true, products: { some: productWhere } },
    select: { id: true, name: true, slug: true, logoUrl: true, description: true, _count: { select: { products: { where: productWhere } } } },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
}
