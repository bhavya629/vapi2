/*
 * Temporary, idempotent migration seed based on the approved demo datasets in
 * data/smartphones.js and data/accessories.js. These are NOT verified shop
 * inventory records. Stock is intentionally seeded as zero until the store
 * imports real quantities. Re-running this script never resets existing stock.
 */
const crypto = require("crypto");
const { Client } = require("pg");
require("dotenv").config();

const smartphoneBrands = [
  "Samsung",
  "Apple",
  "Vivo",
  "Oppo",
  "Realme",
  "Redmi",
  "OnePlus",
  "Nothing",
];
const modelNames = {
  Samsung: [
    "Galaxy S25 Ultra",
    "Galaxy S25",
    "Galaxy A56 5G",
    "Galaxy A36 5G",
    "Galaxy M55",
    "Galaxy F16 5G",
  ],
  Apple: [
    "iPhone 16 Pro Max",
    "iPhone 16 Pro",
    "iPhone 16",
    "iPhone 16 Plus",
    "iPhone 15",
    "iPhone 15 Plus",
  ],
  Vivo: ["X200 Pro", "X200", "V50 5G", "V50e", "T4 5G", "Y39 5G"],
  Oppo: [
    "Find X8 Pro",
    "Find X8",
    "Reno 14 Pro",
    "Reno 14",
    "F29 Pro 5G",
    "K13 5G",
  ],
  Realme: ["GT 7 Pro", "GT 7", "P3 Ultra", "P3 Pro", "14 Pro+", "Narzo 80 Pro"],
  Redmi: ["Note 14 Pro+", "Note 14 Pro", "Note 14", "13 5G", "A4 5G", "K50i"],
  OnePlus: ["13", "13R", "Nord 5", "Nord CE 5", "Open", "12R"],
  Nothing: [
    "Phone (3)",
    "Phone (3a) Pro",
    "Phone (3a)",
    "Phone (2)",
    "Phone (2a) Plus",
    "CMF Phone 2 Pro",
  ],
};
const ram = ["4GB", "6GB", "8GB", "12GB", "16GB"];
const storage = ["64GB", "128GB", "256GB", "512GB"];
const sourceCategories = [
  ["Smart Watch", "Smart Watches"],
  ["Earbuds", "Earphones"],
  ["Power Bank", "Power Banks"],
  ["Charger", "Chargers"],
  ["Cable", "Cables"],
  ["Mobile Cover", "Mobile Covers"],
  ["Tempered Glass", "Tempered Glass"],
  ["Bluetooth Speaker", "Other Accessories"],
];
const accessoryCatalog = {
  "Smart Watch": [
    "Galaxy Watch Ultra",
    "Watch Series 10",
    "Watch 2 Pro",
    "ColorFit Pro 6",
    "Wave Sigma 3",
  ],
  Earbuds: [
    "Galaxy Buds3 Pro",
    "AirPods Pro",
    "Buds Pro 3",
    "Buds Air 7",
    "Airdopes Supreme",
  ],
  "Power Bank": [
    "20,000mAh Fast Power Bank",
    "MagSafe Battery Pack",
    "SuperVOOC Power Bank",
    "Pocket Power 10K",
    "PowerCore Slim",
  ],
  Charger: [
    "45W Super Fast Charger",
    "20W USB-C Adapter",
    "65W GaN Charger",
    "SuperVOOC 80W Adapter",
    "BoostCharge Dual Port",
  ],
  Cable: [
    "USB-C Braided Cable",
    "USB-C to Lightning Cable",
    "SuperVOOC Type-C Cable",
    "3-in-1 Charging Cable",
    "Duraflex Type-C Cable",
  ],
  "Mobile Cover": [
    "Silicone MagSafe Case",
    "Clear Shield Case",
    "Aramid Fiber Case",
    "Rugged Armor Cover",
    "Crystal Clear Cover",
  ],
  "Tempered Glass": [
    "Ultra Clear Screen Guard",
    "Ceramic Shield Protector",
    "Privacy Glass Pro",
    "Edge-to-Edge Glass",
    "Camera Lens Protector",
  ],
  "Bluetooth Speaker": [
    "JBL Flip 7",
    "Stone 1200",
    "SoundDrum P",
    "SoundLink Flex",
    "Roar 2 Speaker",
  ],
};
const accessoryBrands = [
  "Samsung",
  "Apple",
  "OnePlus",
  "Realme",
  "Vivo",
  "Oppo",
  "Nothing",
  "Redmi",
  "boAt",
  "Noise",
  "JBL",
  "Portronics",
];
const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const stableId = (prefix, value) =>
  `${prefix}_${crypto.createHash("sha1").update(value).digest("hex").slice(0, 20)}`;

function buildProducts() {
  const phones = smartphoneBrands.flatMap((brand, brandIndex) =>
    modelNames[brand].map((name, index) => {
      const legacyId = brandIndex * 6 + index + 1;
      const price = 14999 + brandIndex * 3500 + index * 7200;
      const discount = 8 + ((brandIndex + index) % 5) * 3;
      return {
        productType: "SMARTPHONE",
        legacyId,
        brand,
        category: "Smartphones",
        name,
        slug: `${slugify(brand)}-${slugify(name)}`,
        sku: `DEMO-SP-${String(legacyId).padStart(3, "0")}`,
        price,
        originalPrice: Math.round(price / (1 - discount / 100)),
        rating: 4.1 + ((brandIndex + index) % 8) / 10,
        reviewCount: 37 + (48 - legacyId),
        isFeatured: index === 0,
        displayOrder: legacyId,
        specifications: {
          ram: ram[(brandIndex + index) % ram.length],
          storage: storage[(brandIndex * 2 + index) % storage.length],
          visual: (brandIndex + index) % 4,
          newest: 48 - legacyId,
          sales: 1000 - brandIndex * 53 - index * 31,
        },
      };
    }),
  );
  const accessories = sourceCategories.flatMap(
    ([sourceCategory, category], categoryIndex) =>
      accessoryCatalog[sourceCategory].map((name, index) => {
        const legacyId = categoryIndex * 5 + index + 1;
        const price = 699 + categoryIndex * 330 + index * 740;
        const discount = 10 + ((categoryIndex + index) % 5) * 4;
        return {
          productType: "ACCESSORY",
          legacyId,
          brand:
            accessoryBrands[
              (categoryIndex * 2 + index) % accessoryBrands.length
            ],
          category,
          name,
          slug: `accessory-${slugify(name)}-${legacyId}`,
          sku: `DEMO-AC-${String(legacyId).padStart(3, "0")}`,
          price,
          originalPrice: Math.round(price / (1 - discount / 100)),
          rating: 4.1 + ((categoryIndex + index) % 8) / 10,
          reviewCount: 42 + categoryIndex * 13 + index * 9,
          isFeatured: index === 0,
          displayOrder: legacyId,
          specifications: {
            sourceCategory,
            visual: (categoryIndex + index) % 4,
            newest: 40 - legacyId,
            badge:
              index === 0
                ? "BEST SELLER"
                : index === 1
                  ? "NEW"
                  : `${discount}% OFF`,
          },
        };
      }),
  );
  return [...phones, ...accessories];
}

async function seed() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error("DIRECT_URL or DATABASE_URL is required.");
  const client = new Client({ connectionString });
  await client.connect();
  const includeDemoSmartphones = process.env.SEED_DEMO_SMARTPHONES === "true";
  const products = buildProducts().filter(
    (product) => product.productType !== "SMARTPHONE" || includeDemoSmartphones,
  );
  const brandNames = [...new Set([...smartphoneBrands, ...accessoryBrands])];
  const categories = [
    ["Smartphones", "SMARTPHONE"],
    ...sourceCategories.map(([, name]) => [name, "ACCESSORY"]),
  ];
  try {
    await client.query("BEGIN");
    for (const [index, name] of brandNames.entries()) {
      const slug = slugify(name);
      await client.query(
        `INSERT INTO "Brand" ("id","name","slug","logoUrl","displayOrder","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name", "logoUrl"=EXCLUDED."logoUrl", "displayOrder"=EXCLUDED."displayOrder", "updatedAt"=NOW()`,
        [
          stableId("brand", slug),
          name,
          slug,
          smartphoneBrands.includes(name) ? `/images/brands/${slug}.png` : null,
          index,
        ],
      );
    }
    for (const [index, [name, type]] of categories.entries()) {
      const slug = slugify(name);
      await client.query(
        `INSERT INTO "Category" ("id","name","slug","productType","displayOrder","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name", "productType"=EXCLUDED."productType", "displayOrder"=EXCLUDED."displayOrder", "updatedAt"=NOW()`,
        [stableId("category", slug), name, slug, type, index],
      );
    }
    // Repairs the only collision produced by the earlier temporary slug rule
    // (Redmi Note 14 Pro+ versus Redmi Note 14 Pro) without touching any stock.
    const oldPlusId = stableId("product", "SMARTPHONE:31");
    const expectedPlainId = stableId("product", "SMARTPHONE:32");
    await client.query(
      `UPDATE "Product" SET "id"=$1 WHERE "id"=$2 AND "productType"='SMARTPHONE' AND "legacyId"=32 AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "id"=$1)`,
      [expectedPlainId, oldPlusId],
    );
    for (const product of products) {
      const brandId = stableId("brand", slugify(product.brand));
      const categoryId = stableId("category", slugify(product.category));
      const id = stableId(
        "product",
        `${product.productType}:${product.legacyId}`,
      );
      const short = `${product.brand} ${product.name} from The Cellphone Studio catalogue.`;
      const values = [
        id,
        product.legacyId,
        product.slug,
        product.sku,
        product.name,
        short,
        `${short} Demo catalogue details must be verified before sale.`,
        product.productType,
        brandId,
        categoryId,
        product.price,
        product.originalPrice,
        0,
        3,
        "/images/product-placeholder.svg",
        JSON.stringify(product.specifications),
        product.rating.toFixed(1),
        product.reviewCount,
        product.isFeatured,
        product.displayOrder,
      ];
      const saved = await client.query(
        `INSERT INTO "Product" ("id","legacyId","slug","sku","name","shortDescription","description","productType","brandId","categoryId","price","originalPrice","stock","lowStockThreshold","imageUrl","specifications","rating","reviewCount","isFeatured","displayOrder","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,$19,$20,NOW()) ON CONFLICT ("productType","legacyId") DO UPDATE SET "slug"=EXCLUDED."slug", "sku"=EXCLUDED."sku", "name"=EXCLUDED."name", "shortDescription"=EXCLUDED."shortDescription", "description"=EXCLUDED."description", "brandId"=EXCLUDED."brandId", "categoryId"=EXCLUDED."categoryId", "price"=EXCLUDED."price", "originalPrice"=EXCLUDED."originalPrice", "lowStockThreshold"=EXCLUDED."lowStockThreshold", "imageUrl"=EXCLUDED."imageUrl", "specifications"=EXCLUDED."specifications", "rating"=EXCLUDED."rating", "reviewCount"=EXCLUDED."reviewCount", "isFeatured"=EXCLUDED."isFeatured", "displayOrder"=EXCLUDED."displayOrder", "updatedAt"=NOW() RETURNING "id"`,
        values,
      );
      const productId = saved.rows[0].id;
      await client.query(
        `INSERT INTO "InventoryMovement" ("id","productId","quantityChange","previousStock","newStock","reason","referenceType","referenceId","note") VALUES ($1,$2,0,0,0,'INITIAL_STOCK','CATALOGUE_SEED',$3,$4) ON CONFLICT ("id") DO NOTHING`,
        [
          stableId("movement", productId),
          productId,
          product.sku,
          "Temporary catalogue import; stock intentionally set to zero pending verified inventory.",
        ],
      );
    }
    await client.query("COMMIT");
    console.log(
      JSON.stringify({
        brands: brandNames.length,
        categories: categories.length,
        products: products.length,
        stockPolicy:
          "All imported demo products start at 0; reruns preserve current stock.",
      }),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

seed().catch((error) => {
  console.error("Catalogue seed failed:", error.message);
  process.exit(1);
});
