# Phase 1 Catalogue and Inventory Implementation

Implementation date: 21 July 2026

## 1. Summary of Changes

Phase 1 replaces browser-bundled catalogue arrays as the runtime source of truth with PostgreSQL-backed brands, categories, products, stock, product images, and inventory movement records. The approved customer layouts remain in place. Homepage catalogue sections, smartphone/accessory listings, and both detail routes now load through public read-only APIs.

No admin, checkout, order, payment, address, database wishlist, enquiry, reporting, or notification feature was implemented.

## 2. Final Prisma Schema Decisions

- Added `Brand` with unique name/slug, logo, active state, display order, timestamps, product relation, and active/order index.
- Added `Category` with product type, unique slug, active state, display order, timestamps, product relation, and public-read index.
- Upgraded the existing `Product`; no competing product table was created.
- Product money remains `Decimal(10,2)` in PostgreSQL/Prisma.
- Added type-scoped compatibility ID uniqueness with `@@unique([productType, legacyId])`, because `/product/1` and `/accessory/1` are both valid historical URLs.
- Added optional SKU, descriptions, original price, low-stock threshold, JSON specifications/compatibility, rating display data, featured/active flags, display order, and Brand/Category relations.
- Added `ProductImage` while retaining `Product.imageUrl` for backward compatibility.
- Added minimal `InventoryMovement` with a controlled `InventoryReason` enum.
- Added database `CHECK` constraints for non-negative prices, product stock, thresholds, review counts, movement stock values, and rating range.
- Stock remains product-level. Colour/RAM/storage variant stock is deferred until actual variant/SKU business rules are approved.
- Existing `User`, `Order`, and `OrderItem` records/tables were preserved.

## 3. Migrations

1. `20260721170000_catalogue_inventory_foundation`
   - Creates catalogue and inventory tables/relations/indexes/checks.
   - Includes a safe legacy Product backfill before removing old Brand/Category strings.
2. `20260721171500_scope_legacy_product_ids`
   - Corrects legacy ID uniqueness to be scoped by product type for URL compatibility.

`prisma migrate dev` was attempted as requested but refused because the execution environment is non-interactive. No reset was used. Reviewed SQL was generated from Prisma diff, enhanced with safe backfill/check constraints, and applied with `prisma migrate deploy`.

## 4. Data Import Strategy

- `prisma/seed.js` is an idempotent temporary migration seed derived from the previous 48-smartphone and 40-accessory datasets.
- It upserts 12 brands, 9 categories, and 88 products using stable slugs/type-scoped legacy IDs.
- It is transaction-wrapped and never deletes users, orders, or products.
- Re-running it updates temporary catalogue metadata but deliberately does **not** overwrite current stock.
- One stable `INITIAL_STOCK` movement is inserted per product and protected from duplication by a stable movement ID.
- The importer was run repeatedly and verified at exactly 12 brands, 9 categories, 88 products, and 88 movements.
- The existing 5 User rows remained present.

## 5. Product URL Strategy

The least disruptive strategy was selected:

- Existing `/product/[id]` and `/accessory/[id]` routes remain.
- Both accept a database slug, database string ID, or historical numeric ID.
- The API requires/uses product type for numeric compatibility, preventing smartphone/accessory ID ambiguity.
- New generated links use slugs.
- No redirects or redirect loops were introduced.

## 6. Price Serialization Strategy

PostgreSQL and Prisma remain authoritative with Decimal values. The public mapper explicitly converts known display-range Decimal values to JavaScript numbers only at the API boundary for compatibility with the approved UI. These values are display conveniences only. Future checkout/order code must reload Decimal prices from PostgreSQL and must never accept cart/API display numbers as financial authority.

## 7. Inventory Strategy

- PostgreSQL `Product.stock` is authoritative and constrained non-negative.
- Temporary/demo catalogue rows are seeded with stock `0`; no availability was invented.
- Seed reruns preserve stock rather than resetting it.
- Public DTOs expose `stock`, `inStock`, and `lowStock`.
- Listing/detail/home cart buttons are disabled at stock zero.
- Product-level inventory movements provide an audit foundation, but no adjustment/order APIs exist in Phase 1.

## 8. API Routes Created

- `GET /api/products` with type, brand, category, search, featured, in-stock, price, sort, page, and bounded-limit filters.
- `GET /api/products/[identifier]` by slug, database ID, or type-scoped legacy ID.
- `GET /api/brands` with optional product type and active product counts.
- `GET /api/categories` with optional product type and active product counts.

All endpoints reject unsupported methods, validate public query inputs, select only required database fields, serialize Decimal values, hide inactive products, and return generic database failure messages.

## 9. Pages Connected

- Homepage Featured Smartphones
- Homepage Featured Accessories
- Homepage Trusted Brands
- Homepage Categories
- `/smartphones`
- `/accessories`
- `/product/[id]`
- `/accessory/[id]`

The listing filters/sorting/pagination now execute in PostgreSQL through API parameters. Loading, empty, failure, inactive/not-found, low-stock, and out-of-stock states were added without changing the design system.

## 10. Temporary Demo-Data Limitations

- All 88 imported products originated from previously approved frontend demo datasets; they are not confirmed live store inventory.
- Prices, descriptions, rating displays, review counts, specifications, and SKUs prefixed `DEMO-` must be reviewed/replaced before launch.
- Every imported product is intentionally out of stock.
- Product media uses `/images/product-placeholder.svg` until verified images are imported.
- Existing static review-card text remains approved presentation content and is not a database review system.
- Runtime pages no longer import the hardcoded datasets. Those files remain only as historical migration references and can be archived after real catalogue acceptance.

## 11. CSV Catalogue Template

`data/catalogue-import-template.csv`

The header includes product type, brand/category, names/slugs/SKU, descriptions, money, stock, threshold, image, active/featured/order fields, and JSON specifications/compatibility. No parser package was added.

## 12. Commands Executed

- Read-only database row counts before migration
- `npx prisma format`
- `npx prisma validate`
- `npx prisma migrate dev --name catalogue_inventory_foundation` (safely refused in non-interactive mode)
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
- `npx prisma migrate deploy`
- `npx prisma generate`
- `npm run catalogue:seed` (multiple idempotency runs)
- Fresh production API smoke tests on an isolated local port
- `npm run build`

No reset, table deletion, user deletion, order deletion, or secret-printing command was run.

## 13. Validation and Build Result

- Prisma format: passed.
- Prisma schema validation: passed.
- Prisma Client generation: passed.
- Migrations: applied successfully.
- Seed: passed and idempotent at 12/9/88/88 records.
- API smoke tests: product list by both types, category filter/sort, numeric detail for both route families, brands, and categories passed on a fresh production server.
- Production build: passed.

The pre-existing dev process on port 3000 retained the old generated Prisma client and returned stale 500s until restart. A fresh production process passed; restart `npm run dev` after schema/client changes.

## 14. Manual Steps Required

1. Restart the currently running Next.js development server.
2. Have the store approve and import real catalogue fields and images using the CSV template/process.
3. Set verified real stock quantities through the future protected inventory workflow; do not edit the browser data.
4. Confirm variant/SKU rules before Phase 2 schema expansion.
5. Configure `NEXT_PUBLIC_SITE_URL` in production for canonical metadata; `.env.example` already documents it.

## 15. Known Limitations

- No admin UI/API exists to manage catalogue or stock.
- No CSV parser/import endpoint exists; the template is for reviewed future import tooling.
- All current products are unavailable until verified stock is entered.
- Cart and wishlist remain localStorage-based by design. Old numeric items remain readable and do not crash, but are not automatically mapped/repriced.
- Checkout remains demo-only. Cart prices/stock are explicitly non-authoritative.
- Product variant stock, media upload/storage, review collection, sitemap, and server-rendered catalogue SEO are later-phase work.
- “Best Selling”/“Best Rating” currently use the safe featured order because there is no real sales/review aggregate model.

## 16. Phase 2 Prerequisites

- Approved real product catalogue and SKU list.
- Decision on separate stock/price for colour, RAM, storage, and accessory variants.
- Selected product image provider and upload policy.
- Secure initial admin provisioning identity/process.
- Approved roles/permissions and admin audit requirements.
- Stock adjustment reasons, restock workflow, low-stock thresholds, and archival rules.

Do not begin Phase 2 until these are confirmed.
