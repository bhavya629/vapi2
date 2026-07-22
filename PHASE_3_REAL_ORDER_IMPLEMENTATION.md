# Phase 3 Real Order Implementation

## 1. Phase summary
Phase 3 replaces the browser-only checkout confirmation with authenticated PostgreSQL orders, owned saved addresses, order history, server quotes, and transactional inventory deduction. Phase 4 payment processing was not started.

## 2. Schema changes
`Address` and `OrderStatusHistory` were added. `Order`, `OrderItem`, `User`, and the order status enum were extended. Payment status, payment method, fulfilment method, and history actor enums were added. Legacy required order columns remain populated for migration compatibility.

## 3. Address architecture
Address APIs derive the owner from the authentication cookie. All detail writes use `id + userId` ownership checks. Default changes and default reassignment after deletion run in transactions, maintaining one service-level default per user.

## 4. Order architecture
Customer APIs call a single order service. Requests accept product identifiers, integer quantities, fulfilment/payment selections, address input, note, and idempotency key. They do not accept authoritative prices, totals, stock, user ID, or statuses.

## 5. Order item snapshot strategy
Each item stores name, slug, SKU, type, brand, category, image, specifications, unit/original price, quantity, and line total. Historical rendering does not depend on later catalogue edits.

## 6. Order number strategy
Numbers use `TCS-YYYYMMDD-XXXXXX`, where the suffix is generated with Node `crypto.randomBytes`. The database unique constraint and transaction retry handle collisions.

## 7. Idempotency strategy
The browser creates a UUID and sends it in both `Idempotency-Key` and the body. A unique `(userId, idempotencyKey)` constraint prevents duplicates. A SHA-256 hash of normalized order input distinguishes safe replay (HTTP 200) from changed-payload conflict (HTTP 409).

## 8. Inventory deduction strategy
COD delivery and Pay at Store pickup deduct stock during order creation. Each deduction writes an `ORDER_DEDUCTION` movement referencing the order, in the same transaction.

## 9. Transaction and concurrency strategy
Order, snapshots, guarded `stock >= quantity` decrements, movements, and initial status history run in a serializable Prisma transaction. Serialization conflicts retry up to three times. Any failed item rolls back the entire order.

## 10. Money calculation strategy
Authoritative PostgreSQL prices are handled with Prisma Decimal. Subtotal and line totals are calculated server-side and serialized as two-decimal strings.

## 11. Delivery charge temporary strategy
The configured temporary charge is `0.00` because the business has not finalized fees. It is never described as free; APIs and UI state that the charge and same-day eligibility are confirmed by the store.

## 12. Payment method behavior
Delivery enables `CASH_ON_DELIVERY`; pickup enables `PAY_AT_STORE`. Both create `PENDING_CONFIRMATION` orders with `PENDING` payment. `ONLINE` exists only as schema preparation and is disabled in Phase 3. No order is marked paid.

## 13. APIs created
- `GET/POST /api/account/addresses`
- `GET/PATCH/DELETE /api/account/addresses/[id]`
- `PATCH /api/account/addresses/[id]/default`
- `GET/POST /api/orders`
- `POST /api/orders/quote`
- `GET /api/orders/[identifier]`

## 14. Pages created
- `pages/orders/[orderNumber].js`

## 15. Pages modified
- Checkout uses saved/new addresses, live quote, and real order creation.
- Order success reloads the owned database order and survives refresh.
- My Orders lists owned records with status filtering.
- Account manages saved addresses.

## 16. Migration name
`20260722170000_real_orders_addresses_order_history`

## 17. Commands executed
`npx prisma format`, `npx prisma validate`, `npx prisma migrate diff`, `npx prisma migrate deploy`, `npx prisma generate`, and `npm run build`.

## 18. Tests performed
Schema formatting/validation, migration deployment, generated-client compilation, production route compilation, unauthenticated API checks, and source review of ownership/idempotency/transaction guards.

## 19. Build result
Next.js production build passes with all Phase 3 pages and API routes.

## 20. Manual steps
Use Phase 2 inventory management to add sellable stock before placing a customer order. Exercise COD and pickup with two separate authenticated test customers before production launch.

## 21. Known limitations
No online payment, reservation expiry, admin order workflow, cancellation/refund, notifications, invoice, finalized delivery fee, or database-enforced partial unique default-address constraint. Default uniqueness is transaction-safe at the service layer.

## 22. Phase 4 prerequisites
Add a verified payment provider flow with signature verification and webhooks, an inventory reservation/expiry policy, payment-attempt persistence, and idempotent reconciliation. Never infer payment success from the browser redirect.
