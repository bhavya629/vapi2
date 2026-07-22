import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { validateVariantProductPayload } from "@/server/validation/variantValidation";

export const variantTreeInclude = {
  colours: { orderBy: { displayOrder: "asc" } },
  variants: {
    orderBy: { displayOrder: "asc" },
    include: {
      combinations: {
        orderBy: { displayOrder: "asc" },
        include: {
          colour: true,
          images: { orderBy: { displayOrder: "asc" } },
          specifications: { orderBy: { displayOrder: "asc" } },
        },
      },
    },
  },
};
export async function getVariantAdminProduct(id) {
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      brand: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      ...variantTreeInclude,
    },
  });
  if (!p) return null;
  return {
    ...p,
    price: Number(p.price),
    originalPrice: p.originalPrice == null ? null : Number(p.originalPrice),
    hasVariants: p.variants.length > 0,
    variants: p.variants.map((v) => ({
      ...v,
      combinations: v.combinations.map((c) => ({
        ...c,
        price: Number(c.price),
        originalPrice: c.originalPrice == null ? null : Number(c.originalPrice),
        colourClientId: c.productColourId,
      })),
    })),
  };
}

export async function listVariantInventory(q = {}) {
  const page = Math.max(1, Number(q.page) || 1),
    limit = Math.min(50, Math.max(1, Number(q.limit) || 20)),
    search = String(q.search || "").trim();
  const where = {
    variant: {
      product: {
        productType: "SMARTPHONE",
        ...(q.brand ? { brandId: String(q.brand) } : {}),
      },
      ...(q.ram ? { ram: String(q.ram) } : {}),
      ...(q.storage ? { storage: String(q.storage) } : {}),
    },
    ...(q.colour ? { colour: { slug: String(q.colour) } } : {}),
    ...(search
      ? {
          OR: [
            { sku: { contains: search, mode: "insensitive" } },
            {
              variant: {
                product: { name: { contains: search, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
    ...(q.stockStatus === "out-of-stock" ? { stock: 0 } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.productVariantColour.findMany({
      where,
      include: {
        variant: {
          include: { product: { include: { brand: true, category: true } } },
        },
        colour: true,
      },
      orderBy: [
        { variant: { product: { name: "asc" } } },
        { variant: { displayOrder: "asc" } },
        { displayOrder: "asc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.productVariantColour.count({ where }),
  ]);
  const products = rows.map((c) => {
    const available = Math.max(0, c.stock - c.reservedStock);
    return {
      id: c.id,
      variantColourId: c.id,
      productId: c.variant.product.id,
      name: c.variant.product.name,
      sku: c.sku,
      brand: c.variant.product.brand,
      category: c.variant.product.category,
      ram: c.variant.ram,
      storage: c.variant.storage,
      colour: c.colour.name,
      stock: c.stock,
      reservedStock: c.reservedStock,
      availableStock: available,
      lowStockThreshold: c.lowStockThreshold,
      stockStatus:
        available <= 0
          ? "OUT_OF_STOCK"
          : available <= c.lowStockThreshold
            ? "LOW_STOCK"
            : "IN_STOCK",
      updatedAt: c.updatedAt,
    };
  });
  const filtered =
    q.stockStatus === "low-stock"
      ? products.filter((p) => p.stockStatus === "LOW_STOCK")
      : q.stockStatus === "in-stock"
        ? products.filter((p) => p.stockStatus === "IN_STOCK")
        : products;
  return {
    products: filtered,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function adjustVariantInventory(input, admin) {
  const id = String(input.variantColourId || ""),
    type = String(input.adjustmentType || ""),
    quantity = Number(input.quantity);
  if (
    !id ||
    !["ADD", "REMOVE", "SET"].includes(type) ||
    !Number.isInteger(quantity) ||
    quantity < 0
  )
    return { fields: { quantity: "Enter a valid variant stock adjustment." } };
  return prisma.$transaction(
    async (tx) => {
      const c = await tx.productVariantColour.findUnique({
        where: { id },
        include: { variant: true },
      });
      if (!c) return null;
      const next =
        type === "ADD"
          ? c.stock + quantity
          : type === "REMOVE"
            ? c.stock - quantity
            : quantity;
      if (next < 0)
        return {
          fields: { quantity: "Adjustment would make stock negative." },
        };
      const changed = await tx.productVariantColour.updateMany({
        where: { id, stock: c.stock },
        data: { stock: next },
      });
      if (changed.count !== 1)
        throw new Prisma.PrismaClientKnownRequestError(
          "Concurrent stock update",
          { code: "P2034", clientVersion: "7" },
        );
      await tx.inventoryMovement.create({
        data: {
          productId: c.variant.productId,
          variantColourId: id,
          quantityChange: next - c.stock,
          previousStock: c.stock,
          newStock: next,
          reason: String(input.reason || "ADMIN_ADJUSTMENT"),
          note: String(input.note || "").slice(0, 500) || null,
          adminUserId: admin.id,
          referenceType: "ADMIN_VARIANT_ADJUSTMENT",
        },
      });
      await audit(
        tx,
        admin,
        "VARIANT_INVENTORY_ADJUSTED",
        c.variant.productId,
        { variantColourId: id, previousStock: c.stock, newStock: next },
      );
      return { stock: next, variantColourId: id };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function variantInventoryHistory(id) {
  const combo = await prisma.productVariantColour.findUnique({
    where: { id },
    include: { variant: { include: { product: true } }, colour: true },
  });
  if (!combo) return null;
  const movements = await prisma.inventoryMovement.findMany({
    where: { variantColourId: id },
    include: { adminUser: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return {
    product: {
      id: combo.variant.productId,
      name: `${combo.variant.product.name} · ${combo.variant.ram} · ${combo.variant.storage} · ${combo.colour.name}`,
      sku: combo.sku,
      stock: combo.stock,
    },
    movements,
  };
}
const audit = (tx, admin, action, id, metadata) =>
  tx.adminAuditLog.create({
    data: {
      adminUserId: admin.id,
      action,
      entityType: "PRODUCT",
      entityId: id,
      metadata,
    },
  });
async function relations(tx, data) {
  const [brand, category] = await Promise.all([
    tx.brand.findFirst({ where: { id: data.brandId, isActive: true } }),
    tx.category.findFirst({
      where: { id: data.categoryId, isActive: true, productType: "SMARTPHONE" },
    }),
  ]);
  const fields = {};
  if (!brand) fields["product.brandId"] = "Select an active brand.";
  if (!category)
    fields["product.categoryId"] = "Select an active smartphone category.";
  return Object.keys(fields).length ? fields : null;
}
function primary(data) {
  const variant = data.variants.find((v) => v.isDefault),
    colour = data.colours.find((c) => c.isDefault),
    combo =
      variant?.combinations.find(
        (c) => c.colourClientId === colour?.clientId && c.isActive,
      ) || data.variants.flatMap((v) => v.combinations).find((c) => c.isActive);
  return {
    variant,
    colour,
    combo,
    image: combo?.images.find((i) => i.isPrimary) || combo?.images[0],
  };
}
async function ensureSkus(tx, data, productId) {
  const skus = data.variants.flatMap((v) => v.combinations.map((c) => c.sku)),
    rows = await tx.productVariantColour.findMany({
      where: {
        sku: { in: skus },
        variant: { productId: { not: productId || "__new__" } },
      },
      select: { sku: true },
    });
  return rows.length
    ? {
        variants:
          "These SKUs already exist: " + rows.map((x) => x.sku).join(", "),
      }
    : null;
}
async function syncParent(tx, productId, data) {
  const d = primary(data),
    stock = data.variants
      .flatMap((v) => v.combinations)
      .filter((c) => c.isActive)
      .reduce((n, c) => n + c.stock, 0);
  return tx.product.update({
    where: { id: productId },
    data: {
      price: d.combo.price,
      originalPrice: d.combo.originalPrice,
      stock,
      reservedStock: 0,
      lowStockThreshold: d.combo.lowStockThreshold,
      imageUrl: d.image.imageUrl,
    },
  });
}

export async function createVariantProduct(body, admin) {
  const checked = validateVariantProductPayload(body);
  if (checked.error) return { fields: checked.error };
  const data = checked.data;
  return prisma.$transaction(
    async (tx) => {
      const rel = await relations(tx, data.product);
      if (rel) return { fields: rel };
      const dup = await ensureSkus(tx, data);
      if (dup) return { fields: dup };
      const d = primary(data),
        product = await tx.product.create({
          data: {
            ...data.product,
            productType: "SMARTPHONE",
            price: d.combo.price,
            originalPrice: d.combo.originalPrice,
            stock: 0,
            lowStockThreshold: d.combo.lowStockThreshold,
            imageUrl: d.image.imageUrl,
          },
        }),
        colourIds = new Map();
      for (const c of data.colours) {
        const row = await tx.productColour.create({
          data: {
            productId: product.id,
            name: c.name,
            slug: c.slug,
            hexCode: c.hexCode,
            isActive: c.isActive,
            isDefault: c.isDefault,
            displayOrder: c.displayOrder,
          },
        });
        colourIds.set(c.clientId, row.id);
      }
      for (const v of data.variants) {
        const row = await tx.productVariant.create({
          data: {
            id: undefined,
            productId: product.id,
            ram: v.ram,
            storage: v.storage,
            isActive: v.isActive,
            isDefault: v.isDefault,
            displayOrder: v.displayOrder,
          },
        });
        for (const c of v.combinations) {
          const combo = await tx.productVariantColour.create({
            data: {
              productVariantId: row.id,
              productColourId: colourIds.get(c.colourClientId),
              sku: c.sku,
              price: c.price,
              originalPrice: c.originalPrice,
              stock: c.stock,
              lowStockThreshold: c.lowStockThreshold,
              isActive: c.isActive,
              isDefault: c.isDefault,
              displayOrder: c.displayOrder,
              images: { create: c.images.map(({ id, ...im }) => im) },
              specifications: {
                create: c.specifications.map(
                  ({ id, ...specification }) => specification,
                ),
              },
            },
          });
          if (c.stock > 0)
            await tx.inventoryMovement.create({
              data: {
                productId: product.id,
                variantColourId: combo.id,
                quantityChange: c.stock,
                previousStock: 0,
                newStock: c.stock,
                reason: "INITIAL_STOCK",
                note: `Initial variant stock for ${c.sku}`,
                adminUserId: admin.id,
              },
            });
        }
      }
      await syncParent(tx, product.id, data);
      await audit(tx, admin, "SMARTPHONE_VARIANT_PRODUCT_CREATED", product.id, {
        variants: data.variants.length,
        colours: data.colours.length,
      });
      return {
        product: await tx.product.findUnique({
          where: { id: product.id },
          include: variantTreeInclude,
        }),
      };
    },
    { timeout: 30000 },
  );
}

export async function updateVariantProduct(id, body, admin) {
  const checked = validateVariantProductPayload(body);
  if (checked.error) return { fields: checked.error };
  const data = checked.data;
  return prisma.$transaction(
    async (tx) => {
      const current = await tx.product.findUnique({
        where: { id },
        include: variantTreeInclude,
      });
      if (!current) return null;
      const rel = await relations(tx, data.product);
      if (rel) return { fields: rel };
      const dup = await ensureSkus(tx, data, id);
      if (dup) return { fields: dup };
      await tx.product.update({
        where: { id },
        data: { ...data.product, productType: "SMARTPHONE" },
      });
      await tx.productColour.updateMany({
        where: { productId: id },
        data: { isDefault: false },
      });
      await tx.productVariant.updateMany({
        where: { productId: id },
        data: { isDefault: false },
      });
      await tx.productVariantColour.updateMany({
        where: { variant: { productId: id } },
        data: { isDefault: false },
      });
      const colourIds = new Map(),
        keptColours = [];
      for (const c of data.colours) {
        const payload = {
          name: c.name,
          slug: c.slug,
          hexCode: c.hexCode,
          isActive: c.isActive,
          isDefault: c.isDefault,
          displayOrder: c.displayOrder,
        };
        const row =
          c.id && current.colours.some((x) => x.id === c.id)
            ? await tx.productColour.update({
                where: { id: c.id },
                data: payload,
              })
            : await tx.productColour.create({
                data: { ...payload, productId: id },
              });
        colourIds.set(c.clientId, row.id);
        keptColours.push(row.id);
      }
      await tx.productColour.updateMany({
        where: { productId: id, id: { notIn: keptColours } },
        data: { isActive: false, isDefault: false },
      });
      const keptVariants = [],
        keptCombos = [];
      for (const v of data.variants) {
        const vp = {
          ram: v.ram,
          storage: v.storage,
          isActive: v.isActive,
          isDefault: v.isDefault,
          displayOrder: v.displayOrder,
        };
        const row =
          v.id && current.variants.some((x) => x.id === v.id)
            ? await tx.productVariant.update({ where: { id: v.id }, data: vp })
            : await tx.productVariant.create({
                data: { ...vp, productId: id },
              });
        keptVariants.push(row.id);
        for (const c of v.combinations) {
          const existing = c.id
              ? await tx.productVariantColour.findFirst({
                  where: { id: c.id, variant: { productId: id } },
                })
              : null,
            cp = {
              productVariantId: row.id,
              productColourId: colourIds.get(c.colourClientId),
              sku: c.sku,
              price: c.price,
              originalPrice: c.originalPrice,
              stock: c.stock,
              lowStockThreshold: c.lowStockThreshold,
              isActive: c.isActive,
              isDefault: c.isDefault,
              displayOrder: c.displayOrder,
            },
            combo = existing
              ? await tx.productVariantColour.update({
                  where: { id: existing.id },
                  data: cp,
                })
              : await tx.productVariantColour.create({ data: cp });
          keptCombos.push(combo.id);
          if (combo.stock !== (existing?.stock ?? 0))
            await tx.inventoryMovement.create({
              data: {
                productId: id,
                variantColourId: combo.id,
                quantityChange: combo.stock - (existing?.stock ?? 0),
                previousStock: existing?.stock ?? 0,
                newStock: combo.stock,
                reason: existing ? "ADMIN_ADJUSTMENT" : "INITIAL_STOCK",
                note: "Stock saved from variant editor.",
                adminUserId: admin.id,
              },
            });
          await tx.productVariantImage.deleteMany({
            where: { productVariantColourId: combo.id },
          });
          await tx.productVariantImage.createMany({
            data: c.images.map(({ id, ...im }) => ({
              ...im,
              productVariantColourId: combo.id,
            })),
          });
          await tx.productVariantSpecification.deleteMany({
            where: { productVariantColourId: combo.id },
          });
          if (c.specifications.length)
            await tx.productVariantSpecification.createMany({
              data: c.specifications.map(
                ({ id: specificationId, ...specification }) => ({
                  ...specification,
                  productVariantColourId: combo.id,
                }),
              ),
            });
        }
      }
      await tx.productVariantColour.updateMany({
        where: { variant: { productId: id }, id: { notIn: keptCombos } },
        data: { isActive: false, isDefault: false },
      });
      await tx.productVariant.updateMany({
        where: { productId: id, id: { notIn: keptVariants } },
        data: { isActive: false, isDefault: false },
      });
      await syncParent(tx, id, data);
      await audit(tx, admin, "SMARTPHONE_VARIANT_PRODUCT_UPDATED", id, {
        variants: data.variants.length,
        colours: data.colours.length,
      });
      return {
        product: await tx.product.findUnique({
          where: { id },
          include: variantTreeInclude,
        }),
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 30000,
    },
  );
}
