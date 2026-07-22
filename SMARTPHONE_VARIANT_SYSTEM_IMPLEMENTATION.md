# Smartphone Variant System Implementation

## Status

The smartphone catalogue now models a parent product separately from RAM/storage variants, colours, exact purchasable combinations, and colour-specific images. Exact combinations are authoritative for SKU, price, stock, reservations, checkout, orders, payment settlement, cancellation, and inventory history. Accessories and legacy products retain their simple-product path.

## Schema and migration

Migration: `20260723020000_smartphone_variants_colours_and_images`.

New models are `ProductVariant`, `ProductColour`, `ProductVariantColour`, and `ProductVariantImage`; the new enum is `ProductImageType`. `ProductVariantColour` is the purchasable unit. It owns globally unique SKU, price, original price, stock, reserved stock, low-stock threshold, active/default state, and ordered images. Order items, inventory reservations, and inventory movements now carry nullable exact-combination relations while preserving legacy records.

Database constraints prevent duplicate RAM/storage variants, duplicate variant/colour pairs, duplicate SKUs, multiple defaults, and multiple primary images. Existing parent `Product` stock and price remain synchronized for compatibility, but exact combination values are authoritative for variant smartphones.

## Admin workflow

New smartphones open the structured variant form: Product Details → Colours → RAM & Storage Variants → Combination Matrix → Images. Admins can add/remove colours and variants, set defaults and display order, configure every exact combination, assign unique SKU/prices/stock/threshold/activity, and add ordered FRONT/BACK/SIDE/ANGLE/OTHER images with one primary image. Creates and edits are transactional, record initial/changed stock movements, and write audit logs. Removed records are deactivated when retained historical data may reference them. Old smartphones are explicitly labelled **Legacy Product**.

The inventory screen exposes exact combination rows and supports product/SKU search plus brand, RAM, storage, colour, and stock-status filters when Smartphone is selected. Adjustments and history target `ProductVariantColour`.

## Public behaviour

Catalogue responses return one parent smartphone. Selection priority is active default variant + default colour, then first active in-stock combination, then first active combination. The stored primary image, exact price/stock/SKU, RAM/storage, ratings, and review count are mapped to the card.

The product page derives RAM, storage, and colour controls from the valid matrix. RAM filters storage, storage filters colours, unavailable colours are disabled, and colour changes the database gallery, price, original price, stock, SKU, and add-to-cart availability. Legacy smartphones and accessories continue through their existing fallback representation.

## Cart, wishlist, checkout, orders, and inventory

Cart identity includes `productVariantColourId`, so combinations never merge. Cart rows retain variant IDs, RAM, storage, colour, SKU, selected image, and price snapshot. Wishlist remains parent-product based and opens the current default combination.

Checkout sends exact IDs only; the server reloads the product, variant, colour, combination, current price, and available stock. Order items snapshot all selection details. Online reservations, Razorpay settlement/expiry, COD deduction, cancellation restoration, and admin stock adjustments use the exact combination with concurrency guards and one-time restoration semantics. Legacy order snapshots remain readable.

## Demo cleanup and seed policy

`npm run smartphones:cleanup` is dry-run by default and requires `--confirm` before mutation. It identifies demo phones using verified `DEMO-SP-*` seed SKUs/known slugs—not zero stock—archives referenced products and deletes only unreferenced products. It never deletes brands or categories. The executed dry run found 48 demo phones: 0 would be archived and 48 would be deleted. No deletion was executed.

Normal `npm run catalogue:seed` no longer creates demo smartphones. They are included only with `SEED_DEMO_SMARTPHONES=true`; accessories, brands, and categories retain their seed path.

## Commands and verification

- `npx prisma format` — passed
- `npx prisma validate` — passed
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` — used to generate the safe additive SQL because an older pre-existing migration ordering issue prevents shadow-database replay
- `npx prisma migrate deploy` — migration applied
- `npx prisma generate` — passed
- `npm run test:variants` — 22/22 passed
- `npm run smartphones:cleanup` — dry-run only; 48 delete candidates, 0 archive candidates
- `npm run build` — passed

## Create Samsung Galaxy S26 Ultra

1. Open Admin → Products → New Product and keep Smartphone selected.
2. Enter `Samsung Galaxy S26 Ultra`, its slug/descriptions, Samsung brand, and active Smartphones category.
3. Add Titanium Blue, Black, Silver, and Orange; choose exactly one default and set colour display orders.
4. Add `12GB / 256GB`, `12GB / 512GB`, `12GB / 1TB`, `16GB / 256GB`, `16GB / 512GB`, and `16GB / 1TB` as required; choose one default and set variant display orders.
5. In the matrix, activate only real combinations and enter a globally unique SKU, selling price, original price, stock, and threshold for each.
6. For every combination, replace placeholders with at least FRONT, BACK, SIDE, and ANGLE URLs; add optional OTHER images, choose one primary, and set image display order.
7. Save. Correct any field-level errors shown, then verify the one-card listing, selector matrix, gallery, cart line, quote, and exact inventory row.

## Known limitations

- The admin accepts validated local/HTTPS image URLs; binary upload/storage is outside this implementation.
- Reordering uses numeric display-order fields rather than drag-and-drop.
- Existing legacy smartphones are not automatically converted; create a structured replacement through admin, archive the legacy record, and preserve its historical orders.
- Confirmed demo cleanup remains an explicit operator action and was intentionally not run.
