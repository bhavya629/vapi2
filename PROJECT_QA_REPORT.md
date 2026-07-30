# PROJECT QA REPORT

**Project:** `vapi-2`  
**Audit date:** 2026-07-30  
**Scope:** Next.js Pages Router application, APIs, Prisma/PostgreSQL, Cloudinary, authentication, admin/customer UI, security, performance, and production build.  
**Audit mode:** Read-only. No application source, configuration, database rows, or Cloudinary assets were modified. This report is the only file created.

## Executive summary

The application compiles and all 47 page entries render HTML, Prisma validates, all 15 migrations are applied, the database has no detected foreign-key orphans, and the existing 30 variant tests pass. Admin and customer API authorization generally rejects anonymous access correctly, same-origin checks work, JWT cookies use appropriate flags, and authenticated read APIs returned JSON 200 when tested with short-lived non-persistent audit tokens.

The project is **not release-ready** because the public catalogue is broken at runtime. `GET /api/products` and `GET /api/products/:identifier` both return JSON 500. The current Prisma schema models several one-to-many product relations as singular, but the public repository queries them as collections and supplies nested `orderBy`. This blocks product listings/details and cascades into search, filters, cart entry, wishlist discovery, checkout discovery, and storefront product sections.

Cloudinary is also not operational in the audited environment: a signed, read-only Cloudinary API ping returned HTTP 401 with `api_secret mismatch`. Upload, deletion, and replacement were therefore not executed because they cannot succeed and would create external assets if partially successful.

Additional release blockers are 18 ESLint errors, six high-severity production dependency advisories, permissive legacy JWT fallback, and serverless-unsafe in-memory rate limiting.

## Test summary

| Check | Result |
|---|---|
| `npm run build` | **PASS**; 47 static pages generated, API routes compiled, no build warnings/errors |
| `npm run lint` | **FAIL**; 18 errors and 59 warnings |
| `npm run test:variants` | **PASS**; 30/30 tests |
| `prisma validate` | **PASS** |
| `prisma migrate status` | **PASS**; 15 migrations, database up to date |
| Database/schema diff | **PASS**; empty migration |
| Foreign-key orphan scan | **PASS**; 51 FKs checked, zero orphan violations |
| `npm audit --omit=dev` | **FAIL**; 6 high, 1 moderate |
| Public page HTTP smoke test | **PASS**; all 45 tested page URLs returned HTML 200 |
| Literal internal-link scan | **PASS**; 95 references, zero missing literal routes |
| Public catalogue API | **FAIL**; list and detail return 500 |
| Anonymous admin/customer protection | **PASS**; protected routes return JSON 401/405 |
| Authenticated read APIs | **PASS with security caveat**; tested via legacy JWT fallback |
| Cloudinary credential check | **FAIL**; HTTP 401 `api_secret mismatch` |
| Real signup/login/order/payment/upload mutations | **NOT RUN**; would modify production-like external state |
| Browser visual/console/accessibility automation | **NOT AVAILABLE**; no Playwright/Cypress/browser test setup exists |

## Priority overview

### Critical

1. Public catalogue list and detail APIs return 500.
2. Prisma product relation cardinalities are incompatible with application queries and existing data.
3. Cloudinary credentials fail signed authentication, so image upload/delete/replace are unavailable.

### High

1. Six high-severity production dependency advisories.
2. Legacy JWTs without session records are accepted by default.
3. Storefront product-dependent journeys are unusable because catalogue APIs fail.
4. ESLint quality gate has 18 errors.

### Medium

1. In-memory rate limiting is ineffective across Vercel instances/restarts.
2. Database does not enforce one default address per user.
3. Image replacement can leave an orphan Cloudinary asset when old-image deletion fails.
4. No end-to-end/API/auth/Cloudinary test suite exists.
5. Large client/source modules and image optimization warnings need performance work.

### Low

1. Generated Prisma output is linted, producing 40+ avoidable warnings.
2. Cloudinary configuration metadata is logged on every operation.
3. `/api/hello` returns an unexplained empty object.
4. Several API error envelopes and `Allow` headers are inconsistent.

---

## ✅ Working Features

### Authentication controls

- Signup validation correctly rejects malformed name, email, Indian phone, and weak password with HTTP 422 and field-specific JSON errors.
- Signup rejects unknown fields, including an attempted client-supplied `role`, with HTTP 422.
- Login rejects empty credentials with HTTP 400.
- Cross-origin login is rejected with HTTP 403.
- Logout without a session returns HTTP 200 and emits a clearing cookie.
- Session cookie is `HttpOnly`, `SameSite=Lax`, path-scoped, seven-day limited, and `Secure` in production (`server/auth/sessionAuth.js:62-72`).
- JWT verification catches malformed/expired tokens (`lib/auth.js:23-29`).
- Persisted sessions use random JTIs stored only as SHA-256 hashes (`server/auth/sessionAuth.js:73-91`).
- Duplicate accounts are explicitly handled with HTTP 409 (`pages/api/auth/register.js:69-79`). This branch was source-verified but not executed because creating/altering accounts was outside the read-only audit.
- Passwords are bcrypt-hashed with 12 rounds on registration (`pages/api/auth/register.js:80`).
- Login uses a dummy bcrypt hash when the email is absent, reducing account timing leakage (`pages/api/auth/login.js:11,45`).
- Five failed login attempts trigger a 15-minute lock (`pages/api/auth/login.js:66-82`).

### Admin and customer authorization

- All anonymous admin GET routes returned JSON 401 or method-appropriate JSON 405.
- Anonymous customer/account/order/wishlist GET routes returned JSON 401.
- Cross-origin mutation protection exists for admin and customer routes.
- Authenticated admin read smoke tests returned 200 for dashboard, products, categories, brands, inventory, orders, order stats, customers, enquiries, enquiry stats, reviews, settings, delivery settings, coupons, and banners.
- Authenticated customer read smoke tests returned 200 for profile, addresses, sessions, login history, reviews, enquiries, orders, and wishlist.
- Product, category, brand, review, coupon, banner, and order deletion flows have confirmation UI in their respective admin screens. Product deletion uses `ConfirmDialog` (`pages/admin/products/index.js:274`); review/content/order flows use explicit confirmation calls.

### Database

- Prisma schema syntax and relations validate.
- All 15 migrations are applied.
- Schema-to-database diff is empty.
- 51 foreign keys were checked dynamically; no orphan rows were detected.
- Existing database counts include 42 products, 12 brands, 9 categories, 5 variants, 13 variant-colour combinations, 40 variant images, and 10 users.
- Core uniqueness/index coverage exists for email, product slug/SKU, variant SKU, order number, payment provider IDs, session hashes, wishlist pairs, review ownership, and frequently filtered status/time fields.

### UI and routing

- Every page route in the production build returned HTML 200 in smoke tests.
- No missing literal internal route was found across 95 static references.
- Responsive media queries exist across all major storefront/admin feature styles.
- Major forms expose error roles, labels, loading text, and status regions.
- Cart quantity controls and gallery/product interactions include accessible labels.

### Build and tests

- Production build passes from a clean command path (`prisma generate && next build`).
- Prisma Client generation is included in both build and postinstall.
- All 30 smartphone-variant unit/static tests pass, including uniqueness, defaults, images, specifications, cart identity, checkout snapshots, and cancellation stock targeting.

---

## ❌ Broken Features

### QA-CRIT-001 — Public product catalogue APIs return HTTP 500

- **Priority:** Critical
- **Location:** `server/catalogue/productRepository.js:37-99`, `pages/api/products/index.js:3-4`, `pages/api/products/[identifier].js:4-6`
- **Root cause:** Nested `colours`, `variants`, combination `images`, and related generated Prisma fields are singular in the generated client, while `publicProductSelect` treats them as list relations and supplies `where`/`orderBy`. Prisma rejects the query with `Unknown argument orderBy`.
- **Reproduction:** `GET /api/products` returns `500 {"success":false,"message":"The catalogue is temporarily unavailable."}`. `GET /api/products/qa-placeholder` returns `500 {"success":false,"message":"The product is temporarily unavailable."}`.
- **Impact:** Home product sections, smartphone/accessory listings, search, filters, product details, customer product discovery, add-to-cart entry points, and product-based wishlist/review journeys cannot load authoritative catalogue data.
- **Recommended fix:** Correct Prisma relation cardinalities and partial-default constraint modeling so application-facing relations are arrays, regenerate Prisma Client, then add real query integration tests for both endpoints.

### QA-CRIT-002 — Prisma product relations are modeled as one-to-one despite one-to-many data

- **Priority:** Critical
- **Location:** `prisma/schema.prisma:211`, `prisma/schema.prisma:213`, `prisma/schema.prisma:240`, `prisma/schema.prisma:285`; partial unique fields at lines 230, 248, 267, 310
- **Root cause:** Partial unique annotations used to enforce “one default” make Prisma infer singular reverse relations: `ProductColour?`, `ProductVariant?`, `ProductVariantColour?`, and `ProductVariantImage?`. The database contains 5 variants, 13 combinations, and 40 combination images, proving these are collections.
- **Reproduction:** Generate Prisma Client and inspect generated relation types, or call the public product APIs and observe nested `orderBy` validation errors.
- **Recommended fix:** Model collection relations as lists and enforce one-default semantics without causing relation cardinality inference (for example, via migrations/database partial indexes not represented as relation-defining `@unique`, plus transactional validation). Regenerate and test against current data.

### QA-CRIT-003 — Cloudinary signed authentication fails

- **Priority:** Critical
- **Location:** `server/storage/productImageStorage.js:12-40`; environment deployment configuration
- **Root cause:** The configured cloud name/key/secret combination is not a valid matching credential set. A read-only SDK `api.ping()` returned HTTP 401 with `api_secret mismatch`.
- **Reproduction:** Configure the SDK exactly as the application does and call `cloudinary.api.ping()`; it returns 401.
- **Impact:** Upload, delete, and replacement cannot be verified or expected to work.
- **Recommended fix:** Generate a new API key/secret pair, copy both from the same Cloudinary row, update local/Vercel values (including correct environment scope), redeploy, run a controlled upload/delete/replacement integration test, and verify cleanup.

### QA-HIGH-004 — Storefront customer journeys are functionally blocked

- **Priority:** High
- **Location:** `hooks/useCatalogue.js:6-35`, `pages/smartphones/index.js`, `pages/accessories/index.js`, `pages/product/[id].js`
- **Root cause:** These components depend on the broken product APIs.
- **Reproduction:** Open smartphones/accessories/product pages and wait for client hydration; requests to `/api/products` or `/api/products/:id` fail with 500, producing error/empty states.
- **Recommended fix:** Resolve QA-CRIT-001/002, then execute browser E2E coverage for search, filters, pagination, variants, wishlist, cart, and checkout.

### QA-HIGH-005 — ESLint gate fails

- **Priority:** High
- **Location:** 18 errors across `components/account/AccountSecurityActivity.js:23`, `components/admin/ProductForm.js:70,74`, `components/reviews/ProductReviews.js:26`, `hooks/useAdminApi.js:2`, `hooks/useCatalogue.js:8,32`, `pages/accessories/index.js:20`, `pages/account.js:332`, `pages/account/enquiries/index.js:19`, `pages/admin/enquiries/[enquiryNumber].js:23`, `pages/admin/inventory.js:32`, `pages/admin/orders/[orderNumber].js:40`, `pages/admin/settings/index.js:24`, `pages/checkout.js:111`, `pages/contact.js:143,153`, and `pages/product/[id].js:148`
- **Root cause:** Synchronous state updates inside effects and unstable/missing hook dependencies.
- **Reproduction:** Run `npm run lint`; result is 18 errors and 59 warnings.
- **Recommended fix:** Refactor derived state out of effects, move asynchronous state transitions into callbacks, stabilize dependencies with `useCallback`/`useMemo`, and make lint mandatory in CI.

---

## ⚠ Potential Bugs

### QA-MED-006 — Cloudinary replacement can orphan a newly uploaded asset

- **Priority:** Medium
- **Location:** `server/storage/productImageStorage.js:99-102`
- **Root cause:** New image uploads first; old image deletion happens afterward. If deletion fails, the API returns failure even though the new image already exists.
- **Reproduction:** Upload a replacement while forcing `destroy()` to fail.
- **Recommended fix:** Return the successful new asset while queueing/retrying old cleanup, or destroy the new asset on cleanup failure and report a consistent transaction result.

### QA-MED-007 — Locked users may retain existing sessions

- **Priority:** Medium
- **Location:** `server/auth/sessionAuth.js:121-122`, `pages/api/auth/login.js:66-82`
- **Root cause:** `authenticate()` rejects `SUSPENDED` but not `LOCKED`; login failure updates status to `LOCKED` without revoking existing sessions.
- **Reproduction:** Sign in on one device, trigger account lock from another, then use the original session.
- **Recommended fix:** Define intended lock semantics. If lock should block all access, reject `LOCKED` in `authenticate()` and revoke active sessions when locking.

### QA-MED-008 — Rate limiting is process-local

- **Priority:** Medium
- **Location:** `server/enquiries/rateLimit.js:1`
- **Root cause:** A module-level `Map` is reset on cold start and not shared across Vercel instances.
- **Reproduction:** Distribute requests across concurrent serverless instances or wait for cold starts; limits reset/bypass.
- **Recommended fix:** Use a shared atomic store such as Redis/Upstash or a managed rate-limit service, with endpoint/user/IP-specific policies.

### QA-MED-009 — One default address is not database-enforced

- **Priority:** Medium
- **Location:** `prisma/schema.prisma:170`
- **Root cause:** `(userId, isDefault)` is only indexed, not constrained; concurrent requests or out-of-band writes can create multiple defaults.
- **Reproduction:** Concurrently set two addresses as default or insert directly.
- **Recommended fix:** Add a PostgreSQL partial unique index for `userId WHERE isDefault = true` while preserving a one-to-many Prisma relation.

### QA-LOW-010 — Inconsistent method/error contracts

- **Priority:** Low
- **Location:** delivery-manager mutation routes, auth logout, public catalogue APIs
- **Root cause:** Some 405 responses omit `Allow`; some APIs expose `error.code`, others only `message`.
- **Reproduction:** `GET /api/delivery-manager/orders/qa-placeholder/contact` returns 405 with no `Allow` header; compare with customer/admin helpers.
- **Recommended fix:** Standardize a shared JSON error/method helper across all Pages Router APIs.

---

## Security Issues

### QA-HIGH-011 — Vulnerable production dependencies

- **Priority:** High
- **Location:** `package.json`, `package-lock.json`
- **Root cause:** Audited versions include advisories in Next.js/PostCSS/Sharp and Prisma transitive dependencies (`find-my-way`, `valibot`).
- **Reproduction:** Run `npm audit --omit=dev`; output is 6 high and 1 moderate.
- **Recommended fix:** Review advisories for Pages Router applicability, upgrade Next.js to the patched stable release and Prisma packages together, rerun tests/build/audit, and avoid blind `--force` upgrades.

### QA-HIGH-012 — Legacy stateless JWTs are allowed by default

- **Priority:** High
- **Location:** `server/auth/sessionAuth.js:107-116`; missing `ALLOW_LEGACY_AUTH_TOKENS` in `.env.example`
- **Root cause:** Tokens without `jti` bypass the Session table unless the environment variable is exactly `false`. The audit successfully authenticated admin and customer reads with non-persistent legacy tokens.
- **Reproduction:** Sign a valid token containing `userId/email/role` but no `jti`; protected APIs accept it while the user exists.
- **Impact:** Such tokens cannot be revoked through session controls and undermine the persisted-session design.
- **Recommended fix:** Reject no-JTI tokens by default, remove fallback after migration, document `ALLOW_LEGACY_AUTH_TOKENS=false`, rotate JWT secret if legacy tokens may exist, and test revocation.

### Positive security observations

- No application use of `dangerouslySetInnerHTML`, `eval`, unsafe Prisma raw-query APIs, or browser-readable auth cookies was found.
- Prisma parameterized APIs are used; no SQL injection sink was found in application request paths.
- Admin/customer mutations generally enforce same origin and authentication.
- Upload endpoint checks auth before parsing/uploading, validates MIME header plus file signature, limits to JPEG/PNG/WebP and 8 MB, disables default body parser, and returns JSON.
- Razorpay webhook uses raw-body signature verification and a 250 KB cap.
- Environment inspection logged only existence/length metadata; no secret value is included in this report.

---

## Database Issues

1. **Critical cardinality mismatch:** QA-CRIT-002.
2. **Default address uniqueness:** QA-MED-009.
3. **Schema validation is insufficient as a regression gate:** `prisma validate` and migration status both pass despite runtime-incompatible generated relation shapes. Add generated-client integration queries.
4. **No orphan records found:** all 51 declared FKs returned zero violations.
5. **Migrations:** all 15 local migrations are applied; schema diff is empty.
6. **Indexing:** broad index coverage exists. Re-evaluate overlapping single-column and composite indexes using production query plans once catalogue works.

---

## API Issues

### Runtime request/response evidence

Common response bodies used below:

- **A401:** `{"success":false,"error":{"code":"UNAUTHENTICATED","message":"Authentication is required."}}`
- **C401:** `{"success":false,"error":{"code":"SESSION_INVALID","message":"Your session has expired. Please sign in again."}}`
- **M405:** `{"success":false,"error":{"code":"METHOD_NOT_ALLOWED","message":"Method not allowed."}}`
- **P500-LIST:** `{"success":false,"message":"The catalogue is temporarily unavailable."}`
- **P500-DETAIL:** `{"success":false,"message":"The product is temporarily unavailable."}`

#### Public/auth routes

| Request | Status | Response |
|---|---:|---|
| `GET /api/hello` | 200 | `{}` |
| `GET /api/brands` | 200 | `{success:true,data:{brands:[...]}}` |
| `GET /api/categories` | 200 | `{success:true,data:{categories:[...]}}` |
| `GET /api/products` | **500** | P500-LIST |
| `GET /api/products/qa-placeholder` | **500** | P500-DETAIL |
| `GET /api/reviews/product/qa-placeholder` | 404 | `PRODUCT_NOT_FOUND` JSON |
| `GET /api/auth/me` | 401 | C401 |
| `GET /api/auth/login` | 405 | M405; `Allow: POST` |
| `GET /api/auth/register` | 405 | M405; `Allow: POST` |
| `GET /api/auth/logout` | 405 | JSON method error; `Allow: POST` |
| `GET /api/contact/enquiries` | 405 | M405; `Allow: POST` |
| `GET /api/reviews` | 405 | M405; `Allow: POST` |
| `GET /api/reviews/qa-placeholder` | 405 | M405; `Allow: PATCH, DELETE` |
| `GET /api/reviews/qa-placeholder/report` | 405 | M405; `Allow: POST` |
| `GET /api/reviews/qa-placeholder/vote` | 405 | M405; `Allow: POST` |
| `GET /api/webhooks/razorpay` | 405 | M405; `Allow: POST` |

Validation-only POST evidence:

| Request | Status | Response |
|---|---:|---|
| Invalid `POST /api/auth/register` | 422 | `VALIDATION_ERROR`, name/email/phone/password fields |
| Unknown-field `POST /api/auth/register` | 422 | `UNKNOWN_FIELD` |
| Empty `POST /api/auth/login` | 400 | `INVALID_CREDENTIALS` |
| Cross-origin `POST /api/auth/login` | 403 | `INVALID_ORIGIN` |
| Sessionless `POST /api/auth/logout` | 200 | `{success:true,message:"Logout successful"}` plus clearing cookie |
| Invalid `POST /api/contact/enquiries` | 422 | `VALIDATION_ERROR` with field map |
| Anonymous multipart `POST /api/admin/uploads/products` | 401 | A401 |

#### Account/customer routes

| Request | Anonymous result | Authenticated read result |
|---|---:|---:|
| `GET /api/account/addresses` | 401 C401 | 200, `addresses` |
| `GET /api/account/addresses/qa-placeholder` | 401 C401 | Not run with nonexistent ID |
| `GET /api/account/addresses/qa-placeholder/default` | 405 `Allow: PATCH` | N/A |
| `GET /api/account/change-password` | 405 `Allow: POST` | N/A |
| `GET /api/account/enquiries` | 401 C401 | 200, `enquiries,pagination` |
| `GET /api/account/enquiries/qa-placeholder` | 401 C401 | Not run with nonexistent ID |
| `GET /api/account/enquiries/qa-placeholder/messages` | 405 `Allow: POST` | N/A |
| `GET /api/account/login-history` | 401 C401 | 200, `events` |
| `GET /api/account/profile` | 401 C401 | 200, `profile` |
| `GET /api/account/reviews` | 401 C401 | 200, `reviews,pagination` |
| `GET /api/account/sessions` | 401 C401 | 200, `sessions` |
| `GET /api/account/sessions/qa-placeholder` | 405 `Allow: DELETE` | N/A |
| `GET /api/orders` | 401 C401 | 200, `orders,pagination` |
| `GET /api/orders/qa-placeholder` | 401 C401 | Not run with nonexistent ID |
| `GET /api/orders/quote` | 405 `Allow: POST` | N/A |
| `GET /api/payments/order/qa-placeholder` | 401 C401 | Not run with nonexistent order |
| `GET /api/payments/razorpay/create` | 405 `Allow: POST` | N/A |
| `GET /api/payments/razorpay/retry` | 405 `Allow: POST` | N/A |
| `GET /api/payments/razorpay/verify` | 405 `Allow: POST` | N/A |
| `GET /api/delivery/preview` | 405 `Allow: POST` | N/A |
| `GET /api/wishlist` | 401 C401 | 200, `items,pagination` |
| `GET /api/wishlist/merge` | 405 `Allow: POST` | N/A |
| `GET /api/wishlist/qa-placeholder` | 405 `Allow: DELETE` | N/A |
| `GET /api/wishlist/status` | 405 `Allow: POST` | N/A |
| `GET /api/wishlist/toggle` | 405 `Allow: POST` | N/A |

#### Admin routes

All supported anonymous admin reads below returned **401 A401**; authenticated collection/read endpoints marked “200” succeeded.

| Request | Anonymous | Authenticated read |
|---|---:|---:|
| `GET /api/admin/dashboard` | 401 | 200 |
| `GET /api/admin/products` | 401 | 200 |
| `GET /api/admin/products/qa-placeholder` | 401 | Not run with nonexistent ID |
| `GET /api/admin/categories` | 401 | 200 |
| `GET /api/admin/brands` | 401 | 200 |
| `GET /api/admin/inventory` | 401 | 200 |
| `GET /api/admin/inventory/qa-placeholder/history` | 401 | Not run with nonexistent ID |
| `GET /api/admin/orders` | 401 | 200 |
| `GET /api/admin/orders/qa-placeholder` | 401 | Not run with nonexistent ID |
| `GET /api/admin/orders/stats` | 401 | 200 |
| `GET /api/admin/customers` | 401 | 200 |
| `GET /api/admin/customers/qa-placeholder` | 401 | Not run with nonexistent ID |
| `GET /api/admin/customers/qa-placeholder/activity` | 401 | Not run with nonexistent ID |
| `GET /api/admin/enquiries` | 401 | 200 |
| `GET /api/admin/enquiries/qa-placeholder` | 401 | Not run with nonexistent ID |
| `GET /api/admin/enquiries/stats` | 401 | 200 |
| `GET /api/admin/reviews` | 401 | 200 |
| `GET /api/admin/reviews/qa-placeholder` | 401 | Not run with nonexistent ID |
| `GET /api/admin/settings` | 401 | 200 |
| `GET /api/admin/delivery-settings` | 401 | 200 |
| `GET /api/admin/coupons` | 401 | 200 |
| `GET /api/admin/banners` | 401 | 200 |

Method-only admin GET probes returned JSON 405: banner/brand/category/coupon item routes (`Allow: PATCH, DELETE`), customer status (`PATCH`), enquiry internal-note/priority/status (`PATCH`), enquiry messages (`POST`), inventory adjust (`POST`), order cancel (`POST`), order notes/status (`PATCH`), and upload (`POST, DELETE`).

#### Delivery-manager routes

| Request | Status | Response |
|---|---:|---|
| `GET /api/delivery-manager/dashboard` | 401 | A401 |
| `GET /api/delivery-manager/earnings` | 401 | A401 |
| `GET /api/delivery-manager/orders` | 401 | A401 |
| `GET /api/delivery-manager/orders/qa-placeholder` | 401 | A401 |
| `GET /api/delivery-manager/orders/qa-placeholder/contact` | 405 | M405, missing `Allow` |
| `GET /api/delivery-manager/orders/qa-placeholder/shipping-confirmation` | 405 | M405, missing `Allow` |
| `GET /api/delivery-manager/orders/qa-placeholder/status` | 405 | M405, missing `Allow` |

### API coverage limitations

- Real successful signup/login/logout persistence, duplicate-account execution, session revocation, order creation, checkout, payment, CRUD mutations, and destructive admin operations were not run because they would alter live-like database/external state.
- Authenticated read tests used no-JTI audit JWTs specifically to avoid creating Session/AuthEvent rows. Their acceptance is itself QA-HIGH-012.
- Every API route file received at least a method/auth smoke request; mutation success branches require an isolated disposable QA database and Cloudinary account.

---

## UI Issues

### QA-HIGH-013 — Hydrated product pages show failure states

- **Priority:** High
- **Location:** `hooks/useCatalogue.js:6-35` and all catalogue consumers
- **Root cause:** Runtime API 500 after otherwise successful HTML page render.
- **Reproduction:** Load `/smartphones`, `/accessories`, or `/product/:id` in a browser and inspect network/console.
- **Recommended fix:** Fix schema/repository mismatch and add browser tests that wait for hydrated content.

### QA-MED-014 — No automated browser/accessibility regression suite

- **Priority:** Medium
- **Location:** `package.json`; `tests/`
- **Root cause:** Only one Node test suite exists; no Playwright/Cypress, axe, or visual regression configuration.
- **Reproduction:** Inspect scripts and test files.
- **Recommended fix:** Add isolated E2E coverage for mobile/desktop signup/login, navigation, catalogue, cart, wishlist, checkout, admin CRUD, confirm dialogs, keyboard focus, and WCAG checks.

### QA-MED-015 — Product-image removal has no confirmation

- **Priority:** Medium
- **Location:** `components/admin/ProductImageUploader.js:103-121`
- **Root cause:** Remove immediately calls Cloudinary DELETE; unlike product/entity deletion, no confirmation dialog is displayed.
- **Reproduction:** Click “Remove Image” in an admin product form.
- **Recommended fix:** Reuse the accessible `ConfirmDialog` before permanent remote deletion.

### Positive UI observations

- All page routes returned HTML 200.
- No missing literal internal links were detected.
- Major pages contain responsive breakpoints, reduced-motion rules, loading/error states, and many appropriate ARIA labels.
- Static analysis cannot certify layout at real viewport sizes, focus trapping, screen-reader output, or browser console cleanliness. The catalogue failure is expected to generate console/network errors after hydration.

---

## Performance Issues

### QA-MED-016 — Large client/source modules

- **Priority:** Medium
- **Location:** `components/admin/VariantProductForm.js` (~38 KB source), `pages/product/[id].js` (~29 KB), `pages/contact.js` (~22 KB), `pages/account.js` (~22 KB); largest emitted JS chunk ~211 KB
- **Root cause:** Large monolithic components combine fetching, state, validation, and rendering.
- **Reproduction:** Inspect file/chunk sizes and profile the corresponding routes.
- **Recommended fix:** Split route-specific panels/forms, lazy-load infrequently used admin editors/modals, and use a bundle analyzer with performance budgets.

### QA-MED-017 — Concurrent query pattern raises pg deprecation warning

- **Priority:** Medium
- **Location:** Admin dashboard/data services and Prisma PostgreSQL adapter usage
- **Root cause:** Authenticated admin read testing emitted: “Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0.” This suggests concurrent operations are sharing a client path not safe for future pg versions.
- **Reproduction:** Request authenticated admin dashboard/read endpoints under the current adapter.
- **Recommended fix:** Review adapter/pool construction and concurrent query usage; update Prisma/adapter/pg together and load-test dashboard queries.

### QA-LOW-018 — Unoptimized image warnings

- **Priority:** Low
- **Location:** `pages/account/reviews.js:47`, `pages/admin/index.js:278`, `pages/admin/orders/[orderNumber].js:182`, `pages/orders/[orderNumber].js:80`
- **Root cause:** Raw `<img>` tags bypass Next image optimization.
- **Reproduction:** Run `npm run lint`.
- **Recommended fix:** Use `next/image` where appropriate and configure remote image domains/loaders for Cloudinary.

### QA-LOW-019 — Generated Prisma files pollute lint results

- **Priority:** Low
- **Location:** `eslint.config.mjs`, `lib/generated/prisma/**`
- **Root cause:** Generated files are not ignored, producing 40+ unused-disable warnings.
- **Reproduction:** Run `npm run lint`.
- **Recommended fix:** Add generated Prisma output to ESLint global ignores.

---

## Missing Features

1. Disposable staging database and Cloudinary tenant for mutation-safe E2E tests.
2. End-to-end browser suite for authentication, cart, wishlist, checkout, orders, profile, admin CRUD, and responsive behavior.
3. API contract tests covering every supported method, JSON schema, auth role, CSRF case, size boundary, and error branch.
4. Cloudinary integration tests for valid JPEG/PNG/WebP, invalid magic bytes, 8 MB boundary, replacement cleanup, and deletion.
5. Automated accessibility checks and keyboard/focus tests.
6. CI gates for lint, tests, Prisma validation/generation, migration status, dependency audit, and build.
7. Performance monitoring/tracing for slow APIs and database query counts.
8. Payment QA configuration is absent locally (`RAZORPAY_KEY_ID`, secret, and webhook secret not set), so Razorpay success/webhook flows were not testable.
9. A meaningful health endpoint; `/api/hello` currently returns `{}`.

---

## Recommended Improvements

### Critical

1. Repair Prisma product relation cardinalities and regenerate the client.
2. Add integration tests that execute the exact public catalogue select against PostgreSQL.
3. Replace the mismatched Cloudinary credential pair and verify upload/delete/replacement in staging.

### High

1. Upgrade vulnerable Next.js/Prisma/transitive packages with regression testing.
2. Disable and remove legacy no-JTI JWT fallback.
3. Resolve all ESLint errors and enforce lint in CI.
4. Run full storefront/browser regression after catalogue repair.

### Medium

1. Replace in-memory rate limiting with a shared store.
2. Add database-safe default-address uniqueness.
3. Make Cloudinary replacement cleanup resilient and confirm image deletion.
4. Add Playwright plus isolated fixtures for all roles and mutations.
5. Split large components and establish bundle/performance budgets.

### Low

1. Standardize API error envelopes and `Allow` headers.
2. Exclude generated Prisma code from ESLint.
3. Replace remaining raw images with optimized image handling.
4. Reduce repeated Cloudinary configuration logging in normal production operations.

## Final release assessment

**Result: FAIL — not production-ready.** Build success is misleading because the critical catalogue defect is runtime-only. Release should be blocked until QA-CRIT-001/002 and QA-CRIT-003 are resolved, dependency/security risks are triaged, and an isolated mutation-capable E2E pass validates authentication, CRUD, checkout, orders, payments, and media lifecycle.
