import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const slugify = (v) =>
  String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
let validation = read("server/validation/variantValidation.js")
  .replace(/import[^;]+;/, "")
  .replace(
    "export function validateVariantProductPayload",
    "function validateVariantProductPayload",
  )
  .concat("\nresult = validateVariantProductPayload;");
const sandbox = { slugify, result: null };
vm.runInNewContext(validation, sandbox);
const validate = sandbox.result;
const image = (type = "FRONT", primary = true) => ({
  imageUrl: "/images/phone.jpg",
  imageType: type,
  isPrimary: primary,
});
const payload = () => ({
  product: {
    name: "Galaxy S26 Ultra",
    slug: "galaxy-s26-ultra",
    brandId: "brand",
    categoryId: "category",
    description: "Phone",
  },
  colours: [{ clientId: "blue", name: "Blue", isDefault: true }],
  variants: [
    {
      clientId: "12-256",
      ram: "12GB",
      storage: "256GB",
      isDefault: true,
      combinations: [
        {
          colourClientId: "blue",
          sku: "S26-BLU",
          price: 99999,
          originalPrice: 109999,
          stock: 5,
          lowStockThreshold: 2,
          isActive: true,
          images: [image()],
          specifications: [
            { key: "Display", value: "6.9-inch AMOLED", displayOrder: 0 },
          ],
        },
      ],
    },
  ],
});
const ok = (p) => assert.ok(validate(p).data);
test("one variant and colour validates", () => ok(payload()));
test("multiple RAM/storage validates", () => {
  const p = payload();
  p.variants.push({
    ...structuredClone(p.variants[0]),
    clientId: "16-512",
    ram: "16GB",
    storage: "512GB",
    isDefault: false,
    combinations: [
      { ...structuredClone(p.variants[0].combinations[0]), sku: "S26-16-512" },
    ],
  });
  ok(p);
});
test("multiple colours validate", () => {
  const p = payload();
  p.colours.push({ clientId: "black", name: "Black" });
  p.variants[0].combinations.push({
    ...structuredClone(p.variants[0].combinations[0]),
    colourClientId: "black",
    sku: "S26-BLK",
    isDefault: false,
  });
  ok(p);
});
test("colour images retain types", () => {
  const p = payload();
  p.variants[0].combinations[0].images = [
    image("FRONT", true),
    image("BACK", false),
    image("SIDE", false),
    image("ANGLE", false),
  ];
  assert.equal(validate(p).data.variants[0].combinations[0].images.length, 4);
});
test("duplicate SKU rejected", () => {
  const p = payload();
  p.colours.push({ clientId: "black", name: "Black" });
  p.variants[0].combinations.push({
    ...structuredClone(p.variants[0].combinations[0]),
    colourClientId: "black",
  });
  assert.ok(validate(p).error);
});
test("duplicate RAM/storage rejected", () => {
  const p = payload();
  p.variants.push({
    ...structuredClone(p.variants[0]),
    clientId: "duplicate",
    isDefault: false,
  });
  assert.ok(validate(p).error);
});
test("exactly one default variant", () => {
  const p = payload();
  p.variants[0].isDefault = false;
  assert.ok(validate(p).error.variantDefault);
});
test("exactly one default colour", () => {
  const p = payload();
  p.colours[0].isDefault = false;
  assert.ok(validate(p).error.colourDefault);
});
test("inactive default rejected", () => {
  const p = payload();
  p.variants[0].combinations[0].isActive = false;
  assert.ok(validate(p).error.defaultCombination);
});
test("negative stock rejected", () => {
  const p = payload();
  p.variants[0].combinations[0].stock = -1;
  assert.ok(validate(p).error);
});
test("original price below price rejected", () => {
  const p = payload();
  p.variants[0].combinations[0].originalPrice = 1;
  assert.ok(validate(p).error);
});
test("combination requires image", () => {
  const p = payload();
  p.variants[0].combinations[0].images = [];
  assert.ok(validate(p).error);
});
test("combination requires one primary", () => {
  const p = payload();
  p.variants[0].combinations[0].images = [image("FRONT", false)];
  assert.ok(validate(p).error);
});
test("active combination requires specifications", () => {
  const p = payload();
  p.variants[0].combinations[0].specifications = [];
  assert.match(
    validate(p).error["variants.0.combinations.0.specifications"],
    /at least one specification/i,
  );
});
test("specification key and value are required", () => {
  const p = payload();
  p.variants[0].combinations[0].specifications = [
    { key: "Display", value: "" },
  ];
  assert.ok(
    validate(p).error["variants.0.combinations.0.specifications.0.value"],
  );
});
test("duplicate specification keys are rejected within one combination", () => {
  const p = payload();
  p.variants[0].combinations[0].specifications.push({
    key: "display",
    value: "Duplicate",
  });
  assert.match(
    validate(p).error["variants.0.combinations.0.specifications.1.key"],
    /unique/i,
  );
});
test("same specification key is valid in different combinations", () => {
  const p = payload();
  p.colours.push({ clientId: "silver", name: "Silver" });
  p.variants[0].combinations.push({
    ...structuredClone(p.variants[0].combinations[0]),
    colourClientId: "silver",
    sku: "S26-SLV",
    isDefault: false,
    specifications: [{ key: "Display", value: "Silver display" }],
  });
  ok(p);
});
test("fully empty specification rows are not saved", () => {
  const p = payload();
  p.variants[0].combinations[0].specifications.push({ key: "", value: "" });
  assert.equal(
    validate(p).data.variants[0].combinations[0].specifications.length,
    1,
  );
});
test("HTTPS image accepted", () => {
  const p = payload();
  p.variants[0].combinations[0].images[0].imageUrl =
    "https://example.com/a.jpg";
  ok(p);
});
test("unsafe image URL rejected", () => {
  const p = payload();
  p.variants[0].combinations[0].images[0].imageUrl = "javascript:alert(1)";
  assert.ok(validate(p).error);
});
test("schema has exact combination uniqueness", () =>
  assert.match(
    read("prisma/schema.prisma"),
    /@@unique\(\[productVariantId, productColourId\]\)/,
  ));
test("schema has global SKU uniqueness", () =>
  assert.match(read("prisma/schema.prisma"), /sku\s+String\s+@unique/));
test("schema stores specifications on exact combinations", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model ProductVariantSpecification/);
  assert.match(schema, /@@unique\(\[productVariantColourId, key\]\)/);
  assert.match(
    schema,
    /combination\s+ProductVariantColour\s+@relation\([^\n]+onDelete: Cascade/,
  );
});
test("admin service persists exact-combination specifications", () => {
  const service = read("server/admin/variantAdminService.js");
  assert.match(service, /productVariantSpecification\.deleteMany/);
  assert.match(service, /productVariantSpecification\.createMany/);
});
test("public catalogue returns exact-combination specifications", () => {
  assert.match(
    read("server/catalogue/productRepository.js"),
    /specifications:\s*\{\s*select:/,
  );
  assert.match(
    read("server/catalogue/catalogueMapper.js"),
    /specifications:\s*\(c\.specifications\s*\|\|\s*\[\]\)/,
  );
});
test("cart key includes exact combination", () =>
  assert.match(read("context/CartContext.js"), /productVariantColourId/));
test("checkout submits exact combination", () =>
  assert.match(read("pages/checkout.js"), /productVariantColourId/));
test("order snapshots preserve variant", () =>
  assert.match(
    read("server/orders/orderService.js"),
    /variantSku: combination\?\.sku/,
  ));
test("cancellation targets exact stock", () =>
  assert.match(read("server/orders/adminOrderService.js"), /variantColourId/));
test("accessory legacy path remains", () =>
  assert.match(
    read("server/catalogue/catalogueMapper.js"),
    /product\.variants\s*\|\|\s*\[\]/,
  ));
