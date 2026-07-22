const toNumber = (value) =>
  value === null || value === undefined ? null : Number(value);

export function mapPublicProduct(product) {
  const combinations = (product.variants || []).flatMap((variant) =>
    (variant.combinations || []).map((combination) => ({
      variant,
      combination,
    })),
  );
  const selected =
    combinations.find(
      (x) =>
        x.variant.isDefault &&
        x.combination.colour.isDefault &&
        x.combination.stock - x.combination.reservedStock > 0,
    ) ||
    combinations.find(
      (x) => x.combination.stock - x.combination.reservedStock > 0,
    ) ||
    combinations[0];
  const exact = selected?.combination,
    selectedVariant = selected?.variant,
    selectedColour = exact?.colour;
  const price = toNumber(exact?.price ?? product.price);
  const originalPrice = toNumber(exact?.originalPrice ?? product.originalPrice);
  const specifications =
    product.specifications && typeof product.specifications === "object"
      ? product.specifications
      : {};
  const images = (product.images || []).map((image) => ({
    imageUrl: image.imageUrl,
    altText: image.altText,
    isPrimary: image.isPrimary,
  }));
  const routeRoot =
    product.productType === "SMARTPHONE" ? "/product" : "/accessory";
  const availableStock = exact
    ? Math.max(0, exact.stock - (exact.reservedStock || 0))
    : Math.max(0, product.stock - (product.reservedStock || 0));
  const variantImages = (exact?.images || []).map((image) => ({
    id: image.id,
    imageUrl: image.imageUrl,
    altText: image.altText,
    imageType: image.imageType,
    isPrimary: image.isPrimary,
    displayOrder: image.displayOrder,
  }));
  const primaryImage =
    variantImages.find((x) => x.isPrimary) || variantImages[0];
  return {
    id: product.id,
    legacyId: product.legacyId,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    productType: product.productType,
    brand: product.brand.name,
    brandSlug: product.brand.slug,
    brandLogo: product.brand.logoUrl,
    category: product.category.name,
    categorySlug: product.category.slug,
    price,
    originalPrice,
    oldPrice: originalPrice,
    discount:
      originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0,
    stock: availableStock,
    inStock: availableStock > 0,
    lowStock: availableStock > 0 && availableStock <= product.lowStockThreshold,
    imageUrl: primaryImage?.imageUrl || product.imageUrl,
    image: primaryImage?.imageUrl || product.imageUrl,
    images: variantImages.length ? variantImages : images,
    specifications,
    compatibility: product.compatibility,
    rating: toNumber(product.averageRating) || 0,
    reviewCount: product.totalReviews || 0,
    reviews: product.totalReviews || 0,
    ratingDistribution: {
      1: product.rating1 || 0,
      2: product.rating2 || 0,
      3: product.rating3 || 0,
      4: product.rating4 || 0,
      5: product.rating5 || 0,
    },
    isFeatured: product.isFeatured,
    visual: Number.isInteger(specifications.visual) ? specifications.visual : 0,
    ram: selectedVariant?.ram || specifications.ram || null,
    storage: selectedVariant?.storage || specifications.storage || null,
    sku: exact?.sku || product.sku,
    hasVariants: combinations.length > 0,
    defaultVariantId: selectedVariant?.id || null,
    defaultColourId: selectedColour?.id || null,
    defaultCombinationId: exact?.id || null,
    defaultSelection: selected
      ? {
          productVariantId: selectedVariant.id,
          productVariantColourId: exact.id,
          ram: selectedVariant.ram,
          storage: selectedVariant.storage,
          colourName: selectedColour.name,
          colourSlug: selectedColour.slug,
          sku: exact.sku,
          price,
          originalPrice,
          stock: availableStock,
          image: primaryImage?.imageUrl || product.imageUrl,
          specifications: exact.specifications || [],
        }
      : null,
    variants: (product.variants || []).map((v) => ({
      id: v.id,
      ram: v.ram,
      storage: v.storage,
      isDefault: v.isDefault,
      displayOrder: v.displayOrder,
      combinations: v.combinations.map((c) => ({
        id: c.id,
        productColourId: c.productColourId,
        sku: c.sku,
        price: toNumber(c.price),
        originalPrice: toNumber(c.originalPrice),
        stock: Math.max(0, c.stock - (c.reservedStock || 0)),
        lowStockThreshold: c.lowStockThreshold,
        inStock: c.stock - (c.reservedStock || 0) > 0,
        isDefault: c.isDefault,
        displayOrder: c.displayOrder,
        colour: c.colour,
        images: c.images,
        specifications: (c.specifications || []).map((specification) => ({
          id: specification.id,
          key: specification.key,
          value: specification.value,
          displayOrder: specification.displayOrder,
        })),
      })),
    })),
    colours: product.colours || [],
    newest: specifications.newest || 0,
    sales: specifications.sales || 0,
    badge:
      specifications.badge ||
      (availableStock === 0
        ? "OUT OF STOCK"
        : product.isFeatured
          ? "FEATURED"
          : null),
    route: `${routeRoot}/${product.slug}`,
    detailRoute: `${routeRoot}/${product.slug}`,
  };
}

export function mapPublicBrand(brand) {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logoUrl: brand.logoUrl,
    description: brand.description,
    productCount: brand._count?.products || 0,
  };
}

export function mapPublicCategory(category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    productType: category.productType,
    productCount: category._count?.products || 0,
  };
}
