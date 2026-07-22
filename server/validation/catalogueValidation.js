const types = new Set(["SMARTPHONE", "ACCESSORY"]);
const sorts = new Set(["featured", "newest", "price-asc", "price-desc", "name-asc", "name-desc"]);
const slugPattern = /^[a-z0-9-]{1,100}$/;

const one = (value) => Array.isArray(value) ? value[0] : value;
const positiveInt = (value, fallback, maximum) => { const parsed = Number.parseInt(one(value), 10); return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback; };
const boolean = (value) => { const normalized = one(value); if (normalized === undefined) return undefined; if (normalized === "true") return true; if (normalized === "false") return false; return null; };
const price = (value) => { if (value === undefined) return undefined; const parsed = Number(one(value)); return Number.isFinite(parsed) && parsed >= 0 ? parsed : null; };

export function normalizeProductQuery(query) {
  const typeValue = one(query.type)?.toUpperCase();
  if (typeValue && !types.has(typeValue)) return { error: "Unsupported product type." };
  const sort = one(query.sort) || "featured";
  if (!sorts.has(sort)) return { error: "Unsupported sort option." };
  const featured = boolean(query.featured), inStock = boolean(query.inStock);
  if (featured === null || inStock === null) return { error: "Boolean filters must be true or false." };
  const minPrice = price(query.minPrice), maxPrice = price(query.maxPrice);
  if (minPrice === null || maxPrice === null || (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)) return { error: "Invalid price range." };
  const search = String(one(query.search) || "").trim();
  if (search.length > 80) return { error: "Search is limited to 80 characters." };
  const brand = String(one(query.brand) || "").trim().toLowerCase();
  const category = String(one(query.category) || "").trim().toLowerCase();
  if ((brand && !slugPattern.test(brand)) || (category && !slugPattern.test(category))) return { error: "Invalid brand or category filter." };
  return { value: { type: typeValue, sort, featured, inStock, minPrice, maxPrice, search, brand, category, page: positiveInt(query.page, 1, 100000), limit: positiveInt(query.limit, 12, 50) } };
}

export function normalizeType(value) {
  if (value === undefined) return { value: undefined };
  const normalized = String(one(value)).toUpperCase();
  return types.has(normalized) ? { value: normalized } : { error: "Unsupported product type." };
}
