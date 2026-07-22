# Phase 2 Admin Catalogue Implementation

Implementation date: 21 July 2026

## 1. Phase Summary

Phase 2 adds a protected catalogue administration system for products, brands, categories, product-level stock, visibility, featured state, pricing, safe image references, low-stock thresholds, immutable inventory history, and basic catalogue statistics. Approved customer catalogue pages continue to use the Phase 1 public APIs and therefore reflect active admin changes without redesign.

No orders, checkout processing, Razorpay, addresses, database wishlist, enquiries, reports, uploads, or notifications were implemented.

## 2. Admin Architecture

- Admin pages use `AdminLayout` and `AdminProtectedRoute` rather than the customer Navbar.
- The frontend guard uses the existing `AuthContext` for loading/redirect UX.
- Every admin API independently reloads the current user from PostgreSQL.
- Shared server modules provide authorization, HTTP/origin handling, validation, catalogue mutations, inventory transactions, DTO serialization, and audit records.
- Admin UI provides responsive navigation, loading/error/empty states, forms, tables/cards, confirmation dialogs, inline errors, and toast feedback.

## 3. Authorization Strategy

`server/auth/adminAuth.js` parses and verifies the HttpOnly `auth_token`, extracts only the user ID, reloads the user from PostgreSQL, and requires the live database role to equal `ADMIN`. JWT role claims are not authorization authority.

- Missing/invalid session: HTTP 401.
- Authenticated CUSTOMER: HTTP 403.
- Database ADMIN: permitted even if the JWT role claim is stale CUSTOMER.
- No admin endpoint accepts an actor ID or role from browser input.
- Mutations validate same-origin requests and enforce a 100 KB body limit.

## 4. Admin Provisioning Strategy

`scripts/promote-admin.js` promotes one existing customer by validated email supplied through `ADMIN_EMAIL` or the first CLI argument. It is idempotent, creates no password, and prints no hash/token/secret.

Commands:

```text
npm run admin:promote -- owner@example.com
```

or set `ADMIN_EMAIL` and run `npm run admin:promote`. No user is promoted automatically. At implementation time the database contained five CUSTOMER users and zero ADMIN users.

## 5. Admin Routes Created

- `/admin`
- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]/edit`
- `/admin/brands`
- `/admin/categories`
- `/admin/inventory`

All pages include `noindex,nofollow` through the admin layout.

## 6. Admin APIs Created

- `GET /api/admin/dashboard`
- `GET, POST /api/admin/products`
- `GET, PATCH, DELETE /api/admin/products/[id]`
- `GET, POST /api/admin/brands`
- `PATCH, DELETE /api/admin/brands/[id]`
- `GET, POST /api/admin/categories`
- `PATCH, DELETE /api/admin/categories/[id]`
- `GET /api/admin/inventory`
- `POST /api/admin/inventory/adjust`
- `GET /api/admin/inventory/[productId]/history`

`DELETE` is soft deactivation, not physical deletion.

## 7. Product Validation Rules

- Strict allowed-field list; timestamps, IDs, stock history, and actor fields are rejected.
- Required bounded name/description/classification/image fields.
- Safe generated or supplied lowercase slug.
- Unique slug and optional SKU with safe conflict responses.
- Product type restricted to `SMARTPHONE` or `ACCESSORY`.
- Active Brand and Category must exist; Category type must match Product type.
- Non-negative Decimal-compatible prices; original price cannot be below selling price.
- Non-negative integer initial stock, threshold, and display order.
- Generic product updates reject `stock`; inventory endpoint is mandatory.
- Specifications/compatibility must be JSON objects.
- Active/featured flags must be booleans.

## 8. Brand Validation Rules

- Required bounded name; safe unique slug.
- Optional bounded description.
- Logo is empty, a local `/path`, or HTTPS URL.
- Strict active boolean and non-negative display order.
- Deactivation retains products and warns with active product count.
- No permanent brand deletion exists in the admin UI/API.

## 9. Category Validation Rules

- Required bounded name, safe unique slug, and valid ProductType.
- Safe image reference, description, active state, and display order.
- Product type cannot change while products reference the Category.
- Deactivation retains products/history and warns with product count.
- No permanent category deletion exists in the admin UI/API.

## 10. Inventory Adjustment Design

The browser supplies only product ID, ADD/REMOVE/SET operation, quantity, allowed reason, and bounded note. Server code loads current stock and computes previous/change/new values. ADD/REMOVE require positive whole quantities; SET accepts a non-negative whole value. Negative results are rejected. The browser cannot submit previous/new stock.

Reasons in this phase reuse the existing enum: `ADMIN_ADJUSTMENT`, `RESTOCK`, `CORRECTION`, and `RETURN`. DAMAGED/LOST can use `ADMIN_ADJUSTMENT` plus a note until business reporting requires separate enums.

## 11. Transaction Strategy

Inventory adjustment uses an interactive Prisma transaction at PostgreSQL Serializable isolation. It performs a compare-and-update guard on the previously read stock, writes Product stock and InventoryMovement atomically, writes an AdminAuditLog, and performs bounded contention retries. A ten-request simultaneous ADD test completed with ten HTTP 200 responses, final stock 10, and ten movements—no lost updates.

Product creation also transactionally creates initial stock history when initial stock is greater than zero.

## 12. Audit and History Implementation

- Added nullable database-admin actor relation to `InventoryMovement`.
- Added `AdminAuditLog` for product, brand, category, and inventory actions.
- Audit metadata contains only operational fields, never passwords, JWTs, headers, or secrets.
- Inventory history exposes date, previous/change/new stock, reason, note/reference, and safe admin name/email.
- No history edit/delete UI or API exists.

## 13. Product Deactivation Strategy

Product removal is soft: `isActive=false`. Public listing APIs already filter inactive products, and detail APIs return 404. Reactivation restores visibility when related catalogue structure is valid. Images, inventory history, audit records, and future order references remain intact.

Local cart/wishlist entries remain readable and do not crash. They are not checkout authority; a future order phase must reject inactive/unavailable products server-side.

## 14. Image Strategy

Phase 2 supports only local public paths beginning with one `/` and HTTPS URLs, limited to 500 characters. Protocol-relative, JavaScript, data, file, and arbitrary HTML inputs are rejected. Image previews use the existing fallback. No upload endpoint/storage provider was introduced.

## 15. Migration Created

`20260721190000_admin_catalogue_inventory_management`

It additively creates `AdminAuditLog` and the nullable `InventoryMovement.adminUserId` relation/index. Existing users, products, brands, categories, stock, inventory history, orders, and migrations were preserved.

## 16. Commands Executed

- Read-only role/migration inspection
- `npx prisma format`
- `npx prisma validate`
- `npx prisma migrate deploy`
- `npx prisma generate`
- Isolated production API test server
- Temporary-record authorization/CRUD/inventory tests with complete cleanup
- Concurrent inventory adjustment test
- `npm run build`

No reset, force push, database drop, existing-record deletion, or automatic admin promotion was run.

## 17. Testing Performed

- Unauthenticated admin API: 401.
- CUSTOMER with forged ADMIN JWT role: 403.
- Database ADMIN with stale CUSTOMER JWT role: 200.
- Dashboard/list APIs: 200.
- Product creation: 201.
- Duplicate Brand/Product identifiers: 409.
- Direct generic stock edit: 400.
- Negative price and negative-result stock adjustment: 400.
- ADD 2→5, REMOVE 5→3, SET 3→1: correct.
- Initial plus adjustment history: correct and immutable.
- Soft deactivate: admin 200, public product 404.
- Reactivate: admin 200, public product 200.
- Ten concurrent ADD operations: all 200, final stock and history both 10.
- Temporary users/catalogue records/audits/movements were removed afterward.
- Existing data counts remained intact.

## 18. Build Result

Prisma validation and client generation passed. `npm run build` passed with all seven admin pages and eleven admin API route entries compiled successfully.

## 19. Manual Steps

1. Restart the existing development server so it loads the regenerated Prisma Client.
2. Register/identify the intended owner account.
3. Run `npm run admin:promote -- owner@example.com` with the real existing owner email.
4. Log out/in or refresh the authenticated user after promotion, then open `/admin`.
5. Replace demo catalogue fields and enter verified stock through Inventory.

## 20. Known Limitations

- No production media upload/storage; URL/path references only.
- Stock remains product-level; no variant SKUs.
- Comprehensive distributed rate limiting and stronger CSRF tokens remain Phase 10 hardening work.
- Admin audit history has no dedicated UI; inventory history is visible.
- No bulk CSV importer UI.
- Brand/Category deactivation does not cascade-deactivate products, preventing accidental mass disappearance; managers receive product-count warnings.
- Admin route protection is client-side UX, while APIs provide the actual security boundary.
- No order/customer/payment/revenue analytics are shown.

## 21. Phase 3 Prerequisites

- Final decisions for COD/pay-at-store/online methods.
- Inventory reservation/deduction timing and timeout policy.
- Delivery methods, zones, and fee configuration.
- Cancellation rules and stock restoration behavior.
- Address snapshot fields and GST/tax requirements.
- Public order-number format and allowed order status workflow.

Phase 3 should implement real authenticated order creation/history only. Razorpay remains Phase 5.
