# The Cellphone Studio Production Audit

Audit date: 21 July 2026  
Scope: repository inspection and build verification only. No production phase was implemented.

## 1. Executive Summary

The project is a Next.js 16 Pages Router application with an approved, responsive customer interface, React contexts for session/cart/wishlist state, Prisma 7 with PostgreSQL, and cookie-based JWT authentication. The production build currently succeeds.

The application is **not yet a production e-commerce system**. Authentication, authenticated profile updates, and password changes reach the database. Product browsing and details use hardcoded JavaScript datasets (48 smartphones and 40 accessories). Cart and wishlist state live in browser `localStorage`. Checkout creates a browser `sessionStorage` confirmation only. There are no catalogue, inventory, order, payment, contact-enquiry, address, wishlist, media, or admin APIs.

The existing Prisma schema contains `User`, `Product`, `Order`, and `OrderItem`, but only `User` is used by application APIs. The product model is too narrow for the approved catalogue UI and the order model is too narrow for payment, delivery, immutable snapshots, status history, or safe inventory processing.

The correct first implementation phase is a database-backed product catalogue and inventory foundation. Order or Razorpay work must not begin while the browser remains the source of product IDs, prices, totals, and stock.

### Current functionality classification

| Feature | Classification | Evidence / reason |
|---|---|---|
| Signup | Partially Working | Database-backed and hashes passwords, but validation is incomplete and there is no rate limiting/email verification. |
| Login | Partially Working | Database-backed JWT cookie login; no brute-force protection, revocation, or safe redirect handling. |
| Logout | Partially Working | Clears the cookie safely; JWT cannot be revoked before expiry. |
| Profile | Partially Working | Authenticated read/update API with safe field selection; no CSRF token/rate limiting and email changes have no verification flow. |
| Password change | Partially Working | Authenticated bcrypt comparison and rehashing; no throttling or session revocation. |
| Products | Frontend Demo Only | Hardcoded arrays in `data/`; Prisma `Product` is unused by pages. |
| Product details | Frontend Demo Only | Dynamic URLs resolve hardcoded numeric IDs and placeholder visuals. |
| Cart | Frontend Demo Only / Unsafe for orders | Browser `localStorage`; price and availability are client-owned. |
| Wishlist | Frontend Demo Only | Browser `localStorage`; not tied to a user or synchronized. |
| Checkout | Frontend Demo Only / Unsafe | Client validation and `sessionStorage`; no order API, stock validation, or authoritative totals. |
| Orders | Missing | `/orders` always shows zero; schema exists but no API or creation flow does. |
| Payment | Missing | No Razorpay package, API, verification, webhook, or payment model. |
| Inventory | Missing | A `stock` column exists, but no server workflow uses or protects it. |
| Admin | Missing | No `/admin` pages, role middleware, or admin APIs. |
| Saved addresses | Missing | No model/API; Account shows an honest empty state. |
| Contact form | Frontend Demo Only | Simulated delay and success toast; nothing is stored. |
| Images | Partially Working | Fixed branding/showroom assets are local; product visuals are placeholders. |
| Deployment | Needs Refactoring | Build passes, but production operations, monitoring, storage, secrets, migrations, and transactional commerce flows are not ready. |

## 2. Current Architecture

- Framework: Next.js 16.2.10, Pages Router, React 19.2.4, JavaScript.
- Styling: global CSS plus page-specific CSS Modules.
- Shared shell: `components/Navbar.js`; pages render `components/layout/Footer.js` individually.
- Providers in `pages/_app.js`: `AuthProvider` → `CartProvider` → `WishlistProvider` → shared Navbar/page/Toaster.
- HTTP client: Axios in auth/account flows; no centralized API client.
- Database: Supabase PostgreSQL via Prisma 7 and `@prisma/adapter-pg`.
- Prisma runtime: one reusable client in `lib/prisma.js`; no duplicate Prisma client found.
- Authentication: bcrypt password hashes; seven-day JWT in an HttpOnly cookie.
- Static catalogue: `data/smartphones.js` and `data/accessories.js`.
- Client persistence: cart and wishlist in `localStorage`; checkout confirmation in `sessionStorage`.
- No middleware, server-side page protection, admin layer, job system, webhooks, object storage integration, testing framework, logging service, or monitoring service exists.

### Key dependencies

`next`, `react`, `react-dom`, `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `jsonwebtoken`, `bcryptjs`, `axios`, `cookie`, `react-hot-toast`, and `react-icons`.

No Razorpay SDK, request-schema validator, rate limiter, upload SDK, test runner, or error-monitoring package is installed.

## 3. Existing Routes

### Customer pages

| Route | File | Current source/status |
|---|---|---|
| `/` | `pages/index.js` | Approved homepage; featured content is static/component data. |
| `/smartphones` | `pages/smartphones/index.js` | Filters/sorts/paginates 48 hardcoded phones. |
| `/product/[id]` | `pages/product/[id].js` | Hardcoded smartphone lookup by numeric ID. |
| `/accessories` | `pages/accessories/index.js` | Filters/sorts/paginates 40 hardcoded accessories. |
| `/accessory/[id]` | `pages/accessory/[id].js` | Hardcoded accessory lookup by numeric ID. |
| `/gallery` | `pages/gallery.js` | Local static showroom images. |
| `/about` | `pages/about.js` | Static approved content and local founder/showroom images. |
| `/contact` | `pages/contact.js` | Static details plus simulated form submission. |
| `/login` | `pages/login.js` | Calls real login API, always redirects to `/`. |
| `/signup` | `pages/signup.js` | Calls real registration API, then routes to login despite server also setting a session cookie. |
| `/cart` | `pages/cart.js` | Local cart context only. |
| `/checkout` | `pages/checkout.js` | Client-protected demo; writes confirmation to `sessionStorage`. |
| `/order-success` | `pages/order-success.js` | Reads demo confirmation and explicitly states no order/payment exists. |
| `/wishlist` | `pages/wishlist.js` | Local wishlist context only; available without authentication. |
| `/orders` | `pages/orders.js` | Client-protected empty state; always reports 0. |
| `/account` | `pages/account.js` | Client-protected account dashboard; real profile/password APIs, no addresses/orders. |

### Framework and utility routes

- `/_app` and `/_document` provide the application shell.
- `/404` uses Next.js default behavior; no custom `pages/404.js` exists.
- `/api/hello` is the unused starter API route and should be removed during cleanup.

### Components and contexts

- Shared: `Navbar`, `Footer`.
- Homepage: `FeaturedAccessories`, `Categories`, `FeaturedProducts`, `GoogleReviews`, `TrustedBrands`, `WhyChooseUs`.
- Contexts: `AuthContext`, `CartContext`, `WishlistContext`.
- There is no reusable product repository/service, server authorization helper, API validation layer, order service, inventory service, payment service, or admin component tree.

## 4. Existing Database Models

The single migration and current schema define:

### `User`

`id`, `name`, unique `email`, nullable `phone`, `passwordHash`, `role` (`CUSTOMER`/`ADMIN`), timestamps, and orders relation.

### `Product`

`id`, unique `slug`, `name`, `description`, decimal `price`, one required `imageUrl`, integer `stock`, string `brand`, string `category`, `productType`, `isActive`, and timestamps.

Limitations: brand/category are unvalidated strings; no SKU, original price, short description, status, featured flag, low-stock threshold, variants, multiple images, specifications, ratings configuration, compatibility, colour/RAM/storage, inventory reservations, or stock history.

### `Order`

`id`, unique `orderNumber`, `userId`, contact/address fields, decimal `total`, limited status enum, and timestamps.

Limitations: no subtotal, delivery charge, discount, tax, delivery method, payment method/status, email, state, address snapshot structure, cancellation metadata, notes, idempotency key, or status history.

### `OrderItem`

References `Order` and `Product`, with `name`, decimal `price`, and quantity snapshots.

Limitations: hard dependency on a live product prevents retaining an order if a product must be removed; no SKU/variant/image/specification/tax snapshot.

### Missing models/capabilities

No `Brand`, `Category`, `ProductVariant`, `ProductImage`, `InventoryMovement`, `Address`, `OrderStatusHistory`, `Payment`, `Wishlist`, `WishlistItem`, `ContactEnquiry`, `StoreSetting`, `DeliveryZone`, session/revocation, password reset, or media record exists.

The database contents were not altered or assumed during this audit.

## 5. Existing API Routes

| Endpoint | Method | Auth | Status |
|---|---|---|---|
| `/api/auth/register` | POST | Public | Creates user, bcrypt hash, and JWT cookie. Partial validation only. |
| `/api/auth/login` | POST | Public | Password comparison and JWT cookie. No throttling. |
| `/api/auth/logout` | POST | Cookie not required | Expires JWT cookie. |
| `/api/auth/me` | GET | JWT cookie | Selects safe user fields. |
| `/api/account/profile` | PATCH | JWT cookie | Updates authenticated user's allowed fields and selects safe result. |
| `/api/account/change-password` | POST | JWT cookie | Verifies current password and stores bcrypt hash. |
| `/api/hello` | GET | Public | Unused starter endpoint. |

There are no product, brand, category, inventory, cart, wishlist, address, checkout, order, payment, contact, media, setting, or admin endpoints.

Authentication cookie parsing is duplicated across API files rather than centralized. No endpoint has schema-based body validation, request-size policy, rate limiting, CSRF token/origin enforcement, audit logging, or shared error normalization.

## 6. Authentication Review

### Working controls

- Passwords use bcrypt with cost 12.
- JWT secret is server-side and required at module initialization.
- Cookie is `HttpOnly`, `Path=/`, `SameSite=Lax`, seven-day lifetime, and `Secure` in production.
- Protected account APIs derive `userId` from the verified cookie, not browser parameters.
- `/api/auth/me` and profile responses explicitly select safe fields.
- Login uses a generic invalid-credentials response.
- Roles exist in the database/JWT.

### Gaps

- Protection of `/account`, `/orders`, and `/checkout` is client-side; content is withheld, but there is no middleware/SSR authorization.
- No login/signup/password-change rate limiting or lockout exists.
- No JWT revocation, token version, session store, refresh strategy, or “log out all devices.” A stolen token remains valid until expiry.
- Role in the JWT can become stale, and no admin authorization helper exists.
- Login ignores the validated `redirect` query and always routes to `/`; protected-flow return navigation is broken.
- Registration validation allows weak six-character passwords and does not rigorously validate name/phone/type/length.
- Signup sets a login cookie but sends the user to login; client auth state is not refreshed.
- Email can be changed directly without ownership verification. This is acceptable only if the business explicitly chooses unverified email identities.
- No password reset or email verification architecture exists.
- No CSRF-specific defense beyond `SameSite=Lax`; mutating APIs should validate same-origin requests and use an explicit CSRF strategy.
- JWT cookie helpers are duplicated, increasing drift risk.
- Authentication/security events are not recorded.

## 7. Product and Inventory Review

### Current product data source

- `data/smartphones.js` generates 48 demo smartphones across eight brands.
- `data/accessories.js` generates 40 demo accessories across eight categories.
- Listing, details, homepage product sections, cart, and wishlist consume browser-bundled objects.
- Product images are represented mainly by CSS/icons/placeholders; no production product media exists.
- Database `Product` records are not queried anywhere.

### Inventory state

- `Product.stock` exists in Prisma but is unused.
- Demo products may carry frontend stock values, which are not authoritative.
- Cart clamps quantities locally but cannot prevent concurrent purchases or tampering.
- There is no transactional order/inventory operation, reservation policy, stock ledger, restock flow, low-stock alert, or admin inventory action.

### Required foundation

Introduce normalized Brand/Category/Product records and variant-level inventory only after variant rules are confirmed. Public APIs must return safe catalogue projections. Checkout must send only product/variant IDs and quantities; the server must reload active products, authoritative prices, and stock inside a transaction. Use guarded atomic updates or appropriate transaction isolation to prevent negative stock and overselling. Record every inventory change with its reason and actor.

## 8. Cart and Wishlist Review

### Cart

- Stored under `cellphoneStudioCart` in `localStorage`.
- Restored and normalized on the client.
- Stores product name, brand, image, price, original price, stock, quantity, route, and type.
- Totals and savings are computed entirely in the browser.
- Appropriate for browsing convenience, but unsafe as an order source.

Production rule: retaining an anonymous/local cart is reasonable, but every cart must be repriced and revalidated server-side at checkout. Never persist or charge client-submitted prices.

### Wishlist

- Stored under `cellphoneStudioWishlist` in `localStorage`.
- Not associated with the authenticated user and therefore does not synchronize across devices.
- Stores browser-supplied product metadata.

Production recommendation: retain local wishlist support for guests if desired, then merge/deduplicate product or variant IDs into a database wishlist after login. Return current catalogue data rather than stored client price snapshots.

## 9. Checkout and Order Review

- Checkout requires a user in the client UI and validates contact/address fields in the browser.
- It accepts cart prices/totals from `CartContext` without server verification.
- Submission waits 700 ms and writes customer, address, products, prices, totals, delivery choice, and payment preference to `sessionStorage`.
- `/order-success` reads that object and correctly warns that no database order/payment was created.
- The cart intentionally remains unchanged.
- The saved-address checkbox has no persistence.
- `/orders` always reports zero and performs no database query.
- No order API uses the existing Prisma `Order` or `OrderItem` models.

Production order creation must be authenticated and idempotent, reload products and inventory, snapshot prices/products/address, calculate all totals server-side, apply configured delivery rules, and update inventory in one well-defined transaction. A unique public order number needs a collision-safe generator. Status transitions must be validated and written to immutable history.

The current status enum is insufficient. Prefer an adapted set such as `PENDING_PAYMENT`, `PENDING_CONFIRMATION`, `CONFIRMED`, `PROCESSING`, `PACKED`, `OUT_FOR_DELIVERY`, `READY_FOR_PICKUP`, `DELIVERED`, `CANCELLED`, `FAILED`, and `REFUNDED`, but finalize permitted workflows before migrating.

## 10. Payment Review

Payment is **missing**. “Pay Online” is presentation only. There is no Razorpay dependency, internal pending-order endpoint, Razorpay order creation, checkout invocation, signature verification, webhook, payment record, idempotency key, failure handling, refund state, or reconciliation mechanism.

Required Razorpay flow:

1. Authenticate customer and validate server-owned catalogue/stock/address/delivery data.
2. Create an internal pending order with an idempotency key.
3. Create the Razorpay order server-side using secret credentials.
4. Return only public checkout fields.
5. Open Razorpay Checkout in the browser.
6. Verify signature server-side; also verify amount/currency/order association.
7. Persist a `Payment` record and transition the order idempotently.
8. Apply inventory exactly once according to the agreed reservation/deduction policy.
9. Process signed webhooks idempotently for delayed state changes/reconciliation.
10. Preserve cart on cancellation/failure; clear it only after the approved successful order state.

Never trust a frontend “success” callback alone, expose `RAZORPAY_KEY_SECRET`, or deduct inventory twice across callback and webhook.

## 11. Admin Review

No admin page, placeholder route, admin navigation, dashboard, server-side role guard, or admin API exists. The `ADMIN` enum alone provides no admin capability.

Production admin needs server-enforced role checks for every action, plus audit trails for sensitive mutations. Initial admin creation should be a controlled script/manual database operation—not public registration and not hardcoded credentials. Product, variant, inventory, order, customer, enquiry, delivery, store-setting, and media operations should reuse the same domain services as customer APIs where appropriate.

Admin UI work should start only after the Phase 1 catalogue schema/API contract is approved.

## 12. Security Issues

### Critical

1. **Client-authoritative commerce values:** cart IDs, prices, stock, totals, and savings are browser-controlled. Any future order/payment endpoint that accepts them would permit price and inventory manipulation. No real orders should be enabled until server repricing exists.
2. **No verified payment boundary:** there is no payment verification or idempotency. Treating the current order-success route as paid would permit free/fake orders. The UI currently labels this honestly, so the vulnerability becomes exploitable only if production fulfillment is connected incorrectly.

### High

1. No transactional inventory/order workflow; overselling, negative stock, and double deduction would be likely under concurrency.
2. No authorization infrastructure for future admin APIs. UI hiding must never be used as authorization.
3. Login, registration, and password endpoints have no brute-force/rate-limit protection.
4. JWTs have no revocation/session version. Stolen cookies remain valid for up to seven days, including after password changes.
5. No idempotency/replay protection exists for checkout/order/payment operations.

### Medium

1. Mutating cookie-authenticated APIs rely only on SameSite=Lax; add explicit same-origin/CSRF protection before production.
2. Registration validation is weaker than profile/password-change validation and accepts weak passwords and insufficiently validated field types/lengths.
3. Direct email changes have no verification flow; decide whether verified email identity is required.
4. Login ignores the return path, breaking protected flow UX. Any future redirect implementation must allow only local paths to prevent open redirects.
5. Auth-cookie parsing/verification is duplicated, raising consistency risk.
6. No centralized input schemas, request size limits, structured logging, security audit records, or monitoring.
7. Contact form can claim success without sending/storing anything; future endpoint will need spam/rate protection.
8. No security headers/CSP configuration was found. A Razorpay-compatible CSP must be designed carefully.
9. No dependency/security scanning or automated tests are configured.

### Low

1. Unused public `/api/hello` endpoint expands surface area slightly.
2. Large local PNG brand/logo files increase bandwidth; optimize fixed assets without changing visual design.
3. Some source text displays mojibake characters (for example encoded punctuation/stars), indicating an encoding cleanup need.

### Checks with no current finding

- No `dangerouslySetInnerHTML` usage was found in application code.
- React escapes rendered user strings by default.
- No secret was found referenced in frontend source.
- Protected account APIs do not accept arbitrary browser user IDs.
- Prisma queries observed do not use raw SQL.
- No file upload surface currently exists.

## 13. Production Gaps

- Database-backed public catalogue and search/filter APIs.
- Brand/category/variant/media/inventory structure.
- Admin CRUD and server authorization.
- Server cart validation and pricing.
- Address persistence and ownership checks.
- Transactional order creation and status history.
- Order list/detail APIs scoped to authenticated ownership.
- Razorpay order, verification, webhook, reconciliation, and payment records.
- Configurable delivery zones/fees/store pickup rules.
- Database wishlist synchronization.
- Contact enquiry storage and admin processing.
- Production product media storage/upload security.
- Rate limiting, CSRF strategy, shared validation, idempotency, logging, monitoring, backups, and recovery procedures.
- Password reset/email verification decision and implementation.
- Automated unit, integration, concurrency, API authorization, E2E, accessibility, and payment test suites.
- SEO for real catalogue URLs, sitemap/robots/canonical metadata, performance budgets, and deployment runbook.

## 14. Recommended Database Architecture

This is a recommendation, not an implemented schema.

- **User:** keep core fields; consider `emailVerifiedAt`, `tokenVersion`, and security timestamps only if required by approved auth policy.
- **Brand:** unique slug/name, logo/media, active and display order.
- **Category:** unique slug/name, optional parent, active and display order.
- **Product:** name/slug/SKU strategy, descriptions, type, brand/category relations, status, featured flag, SEO fields, timestamps.
- **ProductVariant:** product relation, unique SKU, price/original price, colour/RAM/storage/compatibility attributes, active status, low-stock threshold. Use structured attributes only after query/filter requirements are finalized.
- **ProductImage:** product/variant relation, storage provider key/URL, alt text, position, primary flag.
- **InventoryMovement:** variant/product relation, signed quantity, reason, order/admin reference, actor, timestamp. Current stock can be stored and guarded atomically while history remains auditable.
- **Address:** user ownership, recipient/contact/address fields, label/default flag, timestamps. Enforce one default through service logic/transaction.
- **Order:** public number, user, customer/address snapshots, delivery method, payment method/status, order status, monetary breakdown, idempotency key, timestamps.
- **OrderItem:** immutable product/variant/SKU/name/image/spec/price/tax snapshots. Product relation should be nullable or use restrictive archival rules so history survives catalogue changes.
- **OrderStatusHistory:** order, from/to status, note, actor, timestamp.
- **Payment:** provider, internal order, provider order/payment IDs, amount/currency/status, verified timestamps, failure metadata, unique provider identifiers. Do not store secrets/card data.
- **Wishlist/WishlistItem:** one wishlist per user, unique product/variant entries.
- **ContactEnquiry:** validated contact fields, status, timestamps, optional assigned admin.
- **StoreSetting/DeliveryZone:** configurable delivery and pickup rules/charges/capacity flags; avoid hardcoded global fees.
- **Media/StoreSetting:** optional records only if gallery/banners/store details become admin-managed.

Use integer minor currency units where practical for payment calculations, or enforce consistent Prisma Decimal conversion and rounding. Never use JavaScript floating-point values as financial authority.

## 15. Recommended API Architecture

### Shared server modules

- `server/auth`: cookie parsing, required user, required role, session/token version policy.
- `server/validation`: request schemas and normalized validation errors.
- `server/catalog`: public catalogue queries and safe DTO mapping.
- `server/inventory`: stock checks, guarded adjustments, movement records.
- `server/orders`: pricing, order creation, idempotency, ownership and state transitions.
- `server/payments/razorpay`: order creation, signature verification, webhook verification and reconciliation.
- `server/http`: method guards, same-origin/CSRF controls, safe error mapping and request IDs.

### Suggested endpoints

- Public reads: `GET /api/products`, `GET /api/products/[slug]`, `GET /api/brands`, `GET /api/categories`.
- Customer: address CRUD, server cart quote, order creation, own order list/detail, wishlist sync.
- Payment: create checkout, verify payment, signed Razorpay webhook.
- Contact: validated/rate-limited enquiry creation.
- Admin: role-protected catalogue, variants, media, inventory, orders, enquiries, delivery and settings.

Prefer slugs for public product URLs while preserving redirects from current numeric demo URLs during migration if those URLs have been published. Use consistent JSON envelopes, safe error codes, pagination limits, strict allowed fields, and ownership checks in service/database queries.

## 16. Recommended Implementation Phases

1. **Catalogue and inventory foundation:** finalize schema decisions; migrate Brand/Category/Product/Variant/Image/Inventory; seed verified catalogue; implement public read APIs; connect approved listing/details/home UI without redesign.
2. **Admin catalogue/inventory:** server role guards, CRUD, media references, stock movements, audit logs.
3. **Orders:** address ownership, authoritative cart quote, transactional order creation, snapshots, order history/detail.
4. **Admin order processing:** permitted state transitions and history.
5. **Razorpay:** pending order, provider order, verified callback/webhook, idempotency and reconciliation.
6. **Saved addresses/account:** persistence and default-address rules.
7. **Wishlist synchronization:** authenticated database state and guest merge policy.
8. **Contact enquiries:** storage, validation, spam controls and admin queue.
9. **Media management:** selected storage provider, secure upload policy and optimization.
10. **Hardening:** validation, rate limiting, CSRF, session policy, headers, audit/logging and secrets rotation.
11. **SEO/performance/deployment:** catalogue metadata, image/CDN strategy, monitoring, migration/backup/runbook.
12. **Final testing:** unit/integration/E2E, authorization, race conditions, payment sandbox, accessibility and operational acceptance.

Each phase should be independently reviewed and deployed behind safe migrations/feature controls where practical.

## 17. Migration Risks

- Current public products use numeric demo IDs; Prisma products use cuid strings and slugs. A URL/redirect mapping decision is required.
- Existing local carts/wishlists contain demo IDs and client prices. They must be reconciled by identifier or deliberately expired; prices must never be migrated as authority.
- Hardcoded product names/specs may not represent real inventory. Seed data must be approved by the store before production.
- Expanding OrderStatus requires a migration strategy for any existing rows, even if the current application does not create them.
- Product variants can radically change inventory and URL/API design; decide variant-level stock before building admin/order flows.
- Changing required image fields may break incomplete records. Migrate with staged nullable/backfill/constraint steps.
- Supabase pooler versus direct URLs must remain correctly separated for runtime and migrations.
- Razorpay callbacks/webhooks can arrive more than once or out of order; idempotent state transitions are mandatory.
- Inventory deduction timing affects payment failures, COD/store pickup, cancellations, and reservations; it is a blocking business rule.
- Adding email verification or session revocation affects existing accounts/tokens and needs a rollout plan.
- Static assets are approved; media migration must not break branding or gallery URLs.

## 18. Required Environment Variables

Observed variable names (values were not recorded or exposed):

- `DATABASE_URL`: runtime PostgreSQL connection used by `lib/prisma.js`.
- `DIRECT_URL`: direct migration connection used by `prisma.config.ts`.
- `JWT_SECRET`: signs/verifies authentication JWTs.

Required later:

- `RAZORPAY_KEY_ID`: server-side public identifier.
- `RAZORPAY_KEY_SECRET`: server-only secret.
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`: browser-safe public key ID if the final integration needs it.
- `NEXT_PUBLIC_SITE_URL`: canonical site origin.
- Storage provider variables after Supabase Storage or Cloudinary is selected.
- Monitoring/email/WhatsApp variables only after those providers and features are approved.

`.env.example` has been created with placeholders only. Real `.env` values must never be committed or printed.

## 19. Files Likely to Be Modified

Phase 1 is likely to touch:

- `prisma/schema.prisma` and a new reviewed migration.
- New seed/import tooling and approved product seed source.
- `data/smartphones.js` and `data/accessories.js` (retired or reduced after migration, not duplicated).
- New shared server catalogue/repository/validation modules.
- New public catalogue API routes.
- Existing homepage product components, `/smartphones`, `/product/[id]`, `/accessories`, and `/accessory/[id]` data-loading logic while preserving their approved markup/styles.
- `next.config.mjs` only if a selected remote image host is required.
- Tests and `.env.example` as infrastructure is introduced.

Later phases will touch contexts, checkout, success, orders, account, contact, auth helpers, Navbar badges, and add admin/payment/address/media routes. They should not be changed during Phase 1 unless a narrowly scoped compatibility requirement is approved.

## 20. Blocking Questions

1. Are all products and their visibility managed entirely by admin after initial import?
2. Provide/confirm the real initial catalogue, SKUs, prices, original prices, descriptions, stock and product images.
3. Do smartphone colour/RAM/storage combinations and accessory options have separate SKUs, prices and stock?
4. Should public product URLs use slugs, and must current numeric URLs redirect?
5. Will checkout support COD, pay-at-store, online Razorpay, or which exact combination by delivery method?
6. At what point does inventory decrease: internal order creation, payment verification, store confirmation, or reservation followed by final deduction?
7. If inventory is reserved before payment, what is the reservation timeout and release policy?
8. What are the delivery charges, who configures them, and are any thresholds or exceptions allowed?
9. Which PIN codes/areas qualify for same-day delivery, and what cutoff/capacity rules apply?
10. Can customers cancel orders, until which statuses, and how should inventory/refunds be handled?
11. Is GST/tax calculation and GST invoice generation required? If yes, supply business GST details and tax rules.
12. Is guest checkout allowed, or must all customers authenticate?
13. Which provider will store product images: Supabase Storage or Cloudinary?
14. Who should receive initial admin access, and what secure one-time provisioning method is preferred? Do not send a password in source code.
15. Are WhatsApp notifications required? If yes, which approved provider/API and message templates?
16. Are email notifications and email verification/password reset required? If yes, which provider/domain?
17. Should wishlist synchronize to an account and merge guest items at login?
18. Should saved checkout addresses persist automatically only with explicit consent?
19. What is the return/refund/replacement policy and which order statuses/actions must represent it?
20. Is product review data admin-configured initially, or will verified customer reviews be collected later?

## 21. Recommended Next Prompt

> Implement Phase 1 only: the production database product catalogue and inventory foundation described in `PROJECT_PRODUCTION_AUDIT.md`. First use my answers to the blocking questions about real catalogue data, product variants, SKU/stock rules, public URL strategy, and image storage. Update Prisma through a reviewed migration, add safe database-backed public catalogue APIs, seed only approved real products, and connect the existing Homepage, Smartphones, Smartphone Details, Accessories, and Accessory Details pages without redesigning them. Preserve existing URLs or add approved redirects, do not implement admin/orders/payments yet, run Prisma validation and `npm run build`, and report all schema/API/data migration decisions.

Do not start this prompt until the blocking catalogue, variant, URL, and image decisions are answered.

## Build Check

Command: `npm run build`  
Result at audit start: production build previously passed; revalidated after audit-file creation in the final audit step.  
Routes present: 18 generated page/API entries, including all customer routes and six real auth/account API routes plus the unused starter endpoint.  
Known build warnings/errors: none observed in the successful Next.js production build.  
Broken functional routes: no compile-time route failures; `/orders`, checkout success, contact submission, catalogue persistence, and related commerce functions remain deliberate demo/missing behavior as documented above.
