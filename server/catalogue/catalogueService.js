import { findPublicProducts, findPublicProduct } from "./productRepository";
import { findPublicBrands } from "./brandRepository";
import { findPublicCategories } from "./categoryRepository";
import { mapPublicBrand, mapPublicCategory, mapPublicProduct } from "./catalogueMapper";
import { normalizeProductQuery, normalizeType } from "@/server/validation/catalogueValidation";

const order = (sort) => ({
  featured: [{ isFeatured: "desc" }, { displayOrder: "asc" }], newest: [{ createdAt: "desc" }],
  "price-asc": [{ price: "asc" }], "price-desc": [{ price: "desc" }],
  "name-asc": [{ name: "asc" }], "name-desc": [{ name: "desc" }],
}[sort]);

export async function listProducts(query) {
  const normalized = normalizeProductQuery(query); if (normalized.error) return normalized;
  const filters = normalized.value;
  const where = { isActive: true,
    ...(filters.type ? { productType: filters.type } : {}),
    ...(filters.featured !== undefined ? { isFeatured: filters.featured } : {}),
    ...(filters.inStock === true ? { stock: { gt: 0 } } : filters.inStock === false ? { stock: 0 } : {}),
    ...(filters.brand ? { brand: { slug: filters.brand, isActive: true } } : {}),
    ...(filters.category ? { category: { slug: filters.category, isActive: true } } : {}),
    ...(filters.search ? { OR: [{ name: { contains: filters.search, mode: "insensitive" } }, { shortDescription: { contains: filters.search, mode: "insensitive" } }, { brand: { name: { contains: filters.search, mode: "insensitive" } } }] } : {}),
    ...((filters.minPrice !== undefined || filters.maxPrice !== undefined) ? { price: { ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}), ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}) } } : {}),
  };
  const [products, total] = await findPublicProducts({ where, orderBy: order(filters.sort), skip: (filters.page - 1) * filters.limit, take: filters.limit });
  const totalPages = Math.ceil(total / filters.limit);
  return { value: { products: products.map(mapPublicProduct), pagination: { page: filters.page, limit: filters.limit, total, totalPages, hasNextPage: filters.page < totalPages, hasPreviousPage: filters.page > 1 } } };
}

export async function getProduct(identifier, productType) { const product = await findPublicProduct(identifier, productType); return product ? mapPublicProduct(product) : null; }
export async function listBrands(type) { const checked = normalizeType(type); if (checked.error) return checked; return { value: (await findPublicBrands(checked.value)).map(mapPublicBrand) }; }
export async function listCategories(type) { const checked = normalizeType(type); if (checked.error) return checked; return { value: (await findPublicCategories(checked.value)).map(mapPublicCategory) }; }
