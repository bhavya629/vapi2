# Phase 5 Razorpay Implementation

## 1. Phase summary
Phase 5 adds Razorpay Orders, Checkout, server verification, raw-body webhooks, retryable attempts, payment visibility, and inventory reservations. Refund execution was not added.

## 2. Razorpay architecture
One server-only module owns the official Razorpay SDK and HMAC operations. Customer APIs never accept an amount or identity. The implementation follows the official [Orders API](https://razorpay.com/docs/api/orders/create/), [Node integration](https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/), and [webhook validation](https://razorpay.com/docs/webhooks/validate-test/) guidance.

## 3. Environment variables
`.env.example` contains placeholders for `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_ENV`, and `NEXT_PUBLIC_APP_URL`. Secrets are server-only.

## 4. Payment schema
`Payment` stores provider order/payment IDs, attempt status, authoritative amount/currency, safe errors, captured state, and verification timestamps. `Order.paidAt` records verified settlement.

## 5. Payment attempt strategy
One internal Order may have multiple Payment rows. Each retry creates a Razorpay Order unless a recent active attempt can be reused. Five attempts per ten minutes are allowed. Only one attempt can complete the order.

## 6. Webhook event strategy
`PaymentEvent` stores a unique event key, safe identifiers, payload hash, processing state, and a bounded error. Raw payloads and headers are not stored.

## 7. Internal payment state machine
Attempts move through CREATED/PENDING/AUTHORIZED/PAID/FAILED. PAID is monotonic. Authorized is not treated as paid; captured or order-paid provider evidence is required.

## 8. Order status synchronization
Online orders start `PENDING_PAYMENT`. Verified capture atomically sets payment PAID, sets `paidAt`, moves the order to `PENDING_CONFIRMATION`, and creates customer-visible history.

## 9. Inventory reservation/deduction strategy
Online checkout atomically increments `reservedStock` and creates 15-minute ACTIVE reservations. Verified payment decrements both physical and reserved stock, converts reservations, and creates deduction movements. Expired reservations are released opportunistically. A scheduled cleanup worker remains future work.

## 10. Amount conversion strategy
`toMinorUnits` parses Decimal strings and uses integer/BigInt arithmetic. No floating-point multiplication is used. Provider amount and INR currency must exactly match the database Payment.

## 11. Checkout flow
Checkout creates the internal order, creates the Razorpay order server-side, loads `https://checkout.razorpay.com/v1/checkout.js`, and opens Standard Checkout. The cart clears only after server verification.

## 12. Verification flow
The callback HMAC uses `providerOrderId|providerPaymentId`, SHA-256, the server secret, and timing-safe comparison. Provider payment is fetched and must be captured, amount-matched, currency-matched, and linked to the attempt.

## 13. Webhook flow
The Pages API disables body parsing, reads a bounded raw body once, verifies `X-Razorpay-Signature`, then handles `payment.authorized`, `payment.captured`, `payment.failed`, and `order.paid`. Valid unsupported events return 200.

## 14. Retry flow
Pending pages use the same order and new immutable attempts. Paid or non-payable orders are blocked; rapid attempts return 429.

## 15. Idempotency strategy
Unique provider IDs and event IDs prevent duplicates. Payment/order PAID checks, ACTIVE reservation conversion, and serializable transactions prevent double deduction and duplicate history.

## 16. API routes created
Create, retry, verify, owned payment summary, and raw Razorpay webhook APIs were added.

## 17. Pages created
`/payment/pending`.

## 18. Pages modified
Checkout enables online payment. Customer/admin order services expose appropriate payment state without secrets.

## 19. Migration name
`20260722213000_razorpay_payment_integration`.

## 20. Commands executed
Official SDK installation, Prisma format/validate/diff/deploy/generate, production builds, and webhook verification.

## 21. Automated/manual tests
Automated raw-body webhook tests cover invalid signature, valid delivery, duplicate delivery, and one event row. Build validates all routes. Real provider create/capture requires dashboard test credentials.

## 22. Build result
Production build passes.

## 23. Test-mode setup steps
Add test keys and webhook secret; set the HTTPS webhook to `/api/webhooks/razorpay`; subscribe to payment.authorized, payment.captured, payment.failed, and order.paid; add low-value stock; test success, replay, failure, popup close, retry, invalid signature, and unaffected COD.

## 24. Live-mode checklist
Activate/KYC the account, configure live keys and a distinct live webhook secret, use production HTTPS, back up the database, verify a small approved live transaction, approve refund/terms/privacy copy, define failed-payment support, and remove test credentials.

## 25. Manual actions required
Provide Razorpay test credentials and configure dashboard webhooks. Confirm auto-capture is enabled. Run complete provider sandbox testing before live mode.

## 26. Known limitations
No refunds, scheduled reservation-expiry worker, notifications, or payment analytics. Paid inventory conflicts require manual store review and later refund handling.

## 27. Phase 6 prerequisites
Add scheduled reservation cleanup, reconciliation/incident tooling, verified refund orchestration, and operational notifications without weakening webhook or inventory idempotency.
