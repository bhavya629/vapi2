import { slugify } from "./adminValidation";

const imagePattern = /^(\/(?!\/)[^\s]{0,499}|https:\/\/[^\s]{1,493})$/i;
const imageTypes = new Set(["FRONT", "BACK", "SIDE", "ANGLE", "OTHER"]);
const text = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const whole = (value) =>
  Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
const money = (value) =>
  Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;

function validateSpecifications(input, path, fields, required) {
  const rows = (Array.isArray(input) ? input : []).filter(
    (row) => text(row?.key, 120) || text(row?.value, 2000),
  );
  const keys = new Set();
  const specifications = rows.map((row, index) => {
    const key = text(row.key, 120);
    const value = text(row.value, 2000);
    const normalizedKey = key.toLocaleLowerCase("en-IN");
    if (!key) fields[`${path}.${index}.key`] = "Specification key is required.";
    if (!value)
      fields[`${path}.${index}.value`] = "Specification value is required.";
    if (key && keys.has(normalizedKey))
      fields[`${path}.${index}.key`] =
        "Specification keys must be unique in this combination.";
    keys.add(normalizedKey);
    return {
      id: text(row.id, 100) || undefined,
      key,
      value,
      displayOrder: whole(row.displayOrder) ?? index,
    };
  });
  if (required && !specifications.length)
    fields[path] = "Active combinations require at least one specification.";
  return specifications;
}

export function validateVariantProductPayload(input = {}) {
  const fields = {};
  const p = input.product || {};
  const colours = Array.isArray(input.colours) ? input.colours : [];
  const variants = Array.isArray(input.variants) ? input.variants : [];
  const product = {
    name: text(p.name, 160),
    slug: slugify(p.slug || p.name),
    brandId: text(p.brandId, 100),
    categoryId: text(p.categoryId, 100),
    shortDescription: text(p.shortDescription, 500) || null,
    description: text(p.description, 5000),
    specifications:
      p.specifications &&
      typeof p.specifications === "object" &&
      !Array.isArray(p.specifications)
        ? p.specifications
        : {},
    compatibility:
      p.compatibility &&
      typeof p.compatibility === "object" &&
      !Array.isArray(p.compatibility)
        ? p.compatibility
        : {},
    isActive: p.isActive !== false,
    isFeatured: Boolean(p.isFeatured),
    displayOrder: whole(p.displayOrder) ?? 0,
  };
  for (const key of ["name", "slug", "brandId", "categoryId", "description"])
    if (!product[key]) fields[`product.${key}`] = `${key} is required.`;
  if (!colours.length) fields.colours = "Add at least one colour.";
  if (!variants.length)
    fields.variants = "Add at least one RAM and storage variant.";

  const colourKeys = new Set();
  const colourNames = new Set();
  let defaultColours = 0;
  const checkedColours = colours.map((colour, index) => {
    const clientId =
      text(colour.clientId || colour.id, 100) || `colour-${index}`;
    const name = text(colour.name, 80);
    const slug = slugify(colour.slug || name);
    const hexCode = text(colour.hexCode, 9) || null;
    if (!name) fields[`colours.${index}.name`] = "Colour name is required.";
    if (!slug || colourNames.has(slug))
      fields[`colours.${index}.slug`] = "Colour slugs must be unique.";
    if (hexCode && !/^#[0-9a-f]{6}$/i.test(hexCode))
      fields[`colours.${index}.hexCode`] = "Use a six-digit hex colour.";
    colourKeys.add(clientId);
    colourNames.add(slug);
    if (colour.isDefault) defaultColours += 1;
    return {
      id: text(colour.id, 100) || undefined,
      clientId,
      name,
      slug,
      hexCode,
      isActive: colour.isActive !== false,
      isDefault: Boolean(colour.isDefault),
      displayOrder: whole(colour.displayOrder) ?? index,
    };
  });
  if (defaultColours !== 1)
    fields.colourDefault = "Choose exactly one default colour.";

  const pairs = new Set();
  const skus = new Set();
  let defaultVariants = 0;
  let activeDefaultCombination = false;
  const checkedVariants = variants.map((variant, variantIndex) => {
    const ram = text(variant.ram, 30);
    const storage = text(variant.storage, 30);
    const clientId =
      text(variant.clientId || variant.id, 100) || `variant-${variantIndex}`;
    const pair = `${ram.toLowerCase()}|${storage.toLowerCase()}`;
    if (!ram) fields[`variants.${variantIndex}.ram`] = "RAM is required.";
    if (!storage)
      fields[`variants.${variantIndex}.storage`] = "Storage is required.";
    if (pairs.has(pair))
      fields[`variants.${variantIndex}.storage`] =
        "Duplicate RAM/storage combination.";
    pairs.add(pair);
    if (variant.isDefault) defaultVariants += 1;
    const combinations = Array.isArray(variant.combinations)
      ? variant.combinations
      : [];
    if (!combinations.length)
      fields[`variants.${variantIndex}.combinations`] =
        "Add at least one colour combination.";
    const seenColours = new Set();
    return {
      id: text(variant.id, 100) || undefined,
      clientId,
      ram,
      storage,
      isActive: variant.isActive !== false,
      isDefault: Boolean(variant.isDefault),
      displayOrder: whole(variant.displayOrder) ?? variantIndex,
      combinations: combinations.map((combination, combinationIndex) => {
        const basePath = `variants.${variantIndex}.combinations.${combinationIndex}`;
        const colourClientId = text(
          combination.colourClientId || combination.productColourId,
          100,
        );
        const sku = text(combination.sku, 80).toUpperCase();
        const price = money(combination.price);
        const originalPrice =
          combination.originalPrice == null || combination.originalPrice === ""
            ? null
            : money(combination.originalPrice);
        const stock = whole(combination.stock);
        const threshold = whole(combination.lowStockThreshold);
        const images = Array.isArray(combination.images)
          ? combination.images
          : [];
        const isActive = combination.isActive !== false;
        if (!colourKeys.has(colourClientId))
          fields[`${basePath}.colourClientId`] = "Select a valid colour.";
        if (seenColours.has(colourClientId))
          fields[`${basePath}.colourClientId`] =
            "Duplicate colour combination.";
        seenColours.add(colourClientId);
        if (!sku || skus.has(sku))
          fields[`${basePath}.sku`] = "Every combination needs a unique SKU.";
        skus.add(sku);
        if (price === null)
          fields[`${basePath}.price`] = "Enter a positive price.";
        if (originalPrice !== null && originalPrice < price)
          fields[`${basePath}.originalPrice`] =
            "Original price cannot be below price.";
        if (stock === null)
          fields[`${basePath}.stock`] = "Stock cannot be negative.";
        if (threshold === null)
          fields[`${basePath}.lowStockThreshold`] =
            "Enter a non-negative threshold.";
        if (!images.length)
          fields[`${basePath}.images`] = "Add at least one image.";
        let primaries = 0;
        const checkedImages = images.map((image, imageIndex) => {
          const imageUrl = text(image.imageUrl, 500);
          const imageType = String(image.imageType || "OTHER").toUpperCase();
          if (!imagePattern.test(imageUrl))
            fields[`${basePath}.images.${imageIndex}.imageUrl`] =
              "Use a local path or HTTPS image URL.";
          if (!imageTypes.has(imageType))
            fields[`${basePath}.images.${imageIndex}.imageType`] =
              "Invalid image type.";
          if (image.isPrimary) primaries += 1;
          return {
            id: text(image.id, 100) || undefined,
            imageUrl,
            altText: text(image.altText, 200) || null,
            imageType,
            isPrimary: Boolean(image.isPrimary),
            displayOrder: whole(image.displayOrder) ?? imageIndex,
          };
        });
        if (primaries !== 1)
          fields[`${basePath}.primary`] = "Choose exactly one primary image.";
        const specifications = validateSpecifications(
          combination.specifications,
          `${basePath}.specifications`,
          fields,
          isActive,
        );
        if (
          variant.isDefault &&
          checkedColours.find((item) => item.clientId === colourClientId)
            ?.isDefault &&
          isActive
        )
          activeDefaultCombination = true;
        return {
          id: text(combination.id, 100) || undefined,
          colourClientId,
          sku,
          price,
          originalPrice,
          stock,
          lowStockThreshold: threshold,
          isActive,
          isDefault: Boolean(combination.isDefault),
          displayOrder: whole(combination.displayOrder) ?? combinationIndex,
          images: checkedImages,
          specifications,
        };
      }),
    };
  });
  if (defaultVariants !== 1)
    fields.variantDefault = "Choose exactly one default RAM/storage variant.";
  if (!activeDefaultCombination)
    fields.defaultCombination =
      "The default variant and colour combination must be active.";
  return Object.keys(fields).length
    ? { error: fields }
    : { data: { product, colours: checkedColours, variants: checkedVariants } };
}
