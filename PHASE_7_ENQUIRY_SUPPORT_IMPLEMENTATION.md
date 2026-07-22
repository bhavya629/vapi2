# Phase 7 Enquiry Support Implementation

## 1. Phase summary

Phase 7 replaces the demo contact submission with a PostgreSQL-backed enquiry and customer-support workflow for guests, authenticated customers, and administrators. It does not send email, WhatsApp, SMS, or attachments.

## 2. Enquiry schema

`Enquiry` stores the reference, optional user/order relations, contact snapshot, classification, status, priority, source, lifecycle timestamps, and private summary note. `EnquiryMessage` stores the immutable chronological conversation and visibility flag. User/order deletion uses `SetNull`; enquiry deletion cascades only its messages.

## 3. Message-history architecture

The initial submission and every follow-up/reply is a new `EnquiryMessage`. Messages are never edited or deleted by an API. Customer DTOs query only `isCustomerVisible: true`; admin DTOs include the complete history.

## 4. Enum definitions

- Categories: GENERAL, PRODUCT_INFORMATION, STOCK_AVAILABILITY, ORDER_SUPPORT, PAYMENT_SUPPORT, DELIVERY_SUPPORT, CANCELLATION_REQUEST, RETURN_OR_REFUND, WARRANTY_SUPPORT, WEBSITE_SUPPORT, OTHER.
- Statuses: OPEN, IN_REVIEW, WAITING_FOR_CUSTOMER, WAITING_FOR_STORE, RESOLVED, CLOSED, SPAM.
- Priorities: LOW, NORMAL, HIGH, URGENT.
- Sources: CONTACT_PAGE, ACCOUNT, ORDER_DETAIL, GUEST.
- Authors: CUSTOMER, ADMIN, SYSTEM, GUEST.

## 5. Enquiry-number strategy

`server/enquiries/enquiryNumber.js` creates `TCS-ENQ-YYYYMMDD-XXXXXX` using `crypto.randomBytes`. A unique database constraint and three-attempt collision retry protect uniqueness.

## 6. Guest submission flow

Guests submit contact snapshots through `POST /api/contact/enquiries`. Server validation, origin checking, body limits, honeypot handling, and rate limits run before an enquiry and initial guest message are committed.

## 7. Authenticated submission flow

The secure session supplies `userId`; the browser cannot choose it. Contact values are prefilled but stored as a submission-time snapshot. Signed-in users can select one of their recent orders and can later view their own history and add follow-ups.

## 8. Order-linking security

The endpoint accepts an order number only. The service queries by both `orderNumber` and the session-derived `userId`; missing and foreign orders receive the same 404 response. Guests cannot link orders.

## 9. Customer ownership rules

Customer list, detail, and message operations always constrain queries by the authenticated `userId`. Email matching is never used for ownership. SPAM entries are excluded, and internal messages/notes are omitted from customer DTOs.

## 10. Status transition map

- OPEN -> IN_REVIEW, WAITING_FOR_CUSTOMER, RESOLVED, SPAM, CLOSED
- IN_REVIEW -> WAITING_FOR_CUSTOMER, WAITING_FOR_STORE, RESOLVED, CLOSED, SPAM
- WAITING_FOR_CUSTOMER -> IN_REVIEW, RESOLVED, CLOSED
- WAITING_FOR_STORE -> IN_REVIEW, WAITING_FOR_CUSTOMER, RESOLVED, CLOSED
- RESOLVED -> CLOSED, IN_REVIEW
- CLOSED -> IN_REVIEW
- SPAM -> CLOSED, OPEN

The service enforces transitions. Customer replies reopen WAITING_FOR_CUSTOMER or RESOLVED enquiries to IN_REVIEW. CLOSED and SPAM enquiries reject customer replies. Resolution/closure timestamps are maintained server-side.

## 11. Priority rules

NORMAL is the default. PAYMENT_SUPPORT, CANCELLATION_REQUEST, and DELIVERY_SUPPORT receive a HIGH initial hint. Admin can select only LOW, NORMAL, HIGH, or URGENT; changes are audit logged.

## 12. Admin architecture

All admin routes use the existing database-backed ADMIN authorization helper. The list supports controlled pagination, search, filters, and relation-aware order search. Detail tools provide valid-transition status changes, priority control, customer-visible or private replies, and a private internal note.

## 13. Customer account integration

`/account/enquiries` lists only the current customer's enquiries. `/account/enquiries/[enquiryNumber]` displays visible conversation history and supports valid follow-ups. My Account links to the enquiry history.

## 14. Contact-page integration

The approved page design remains intact. The form now makes a real API request, prefills authenticated contact details, presents an authenticated order selector, includes an off-screen honeypot, disables duplicate clicks while submitting, and displays the resulting reference.

## 15. Spam/rate-limit strategy

The public endpoint uses same-origin checks, a 20 KB body limit, strict accepted fields, length validation, a honeypot, and a hashed IP/email sliding-window key. Guest submissions allow 5 and authenticated submissions 10 per 15 minutes. Customer follow-ups allow 10 per 15 minutes. The current bucket is process-local; production multi-instance deployment must replace it with a shared Redis/Upstash or database-backed adapter.

## 16. Privacy strategy

Public listing is absent. Ownership and admin roles are checked server-side. Customer mappers exclude internal notes, internal-only messages, raw database IDs, and admin identity/contact details. Text is rendered as React text, not HTML.

## 17. API routes created

- `POST /api/contact/enquiries`
- `GET /api/account/enquiries`
- `GET /api/account/enquiries/[enquiryNumber]`
- `POST /api/account/enquiries/[enquiryNumber]/messages`
- `GET /api/admin/enquiries`
- `GET /api/admin/enquiries/stats`
- `GET /api/admin/enquiries/[enquiryNumber]`
- `PATCH /api/admin/enquiries/[enquiryNumber]/status`
- `PATCH /api/admin/enquiries/[enquiryNumber]/priority`
- `POST /api/admin/enquiries/[enquiryNumber]/messages`
- `PATCH /api/admin/enquiries/[enquiryNumber]/internal-note`

## 18. Pages created

- `/account/enquiries`
- `/account/enquiries/[enquiryNumber]`
- `/admin/enquiries`
- `/admin/enquiries/[enquiryNumber]`

## 19. Pages modified

Contact now submits real enquiries. My Account links to enquiry history. Customer order details provide an order-scoped support link. Admin dashboard/sidebar include enquiry operations and counts.

## 20. Migration name

`20260723003000_customer_enquiry_support_system`

## 21. Commands executed

`npx prisma format`, `npx prisma validate`, `npx prisma migrate deploy`, `npx prisma generate`, and `npm run build`.

## 22. Tests performed

Prisma schema validation and client generation passed. Migration deployment succeeded. Next production compilation, page-data collection, and static generation passed, including all new customer/admin pages and APIs. Service and UI code paths were reviewed for role authorization, user/order ownership predicates, valid transitions, private-message filtering, and plain-text rendering.

## 23. Build result

PASS — Next.js 16.2.10 production build completed successfully.

## 24. Manual actions required

Configure a shared rate-limit store before horizontally scaling production. Perform a browser smoke test with one customer account and one admin account against representative existing orders.

## 25. Known limitations

Rate-limit buckets are in-memory and do not coordinate across processes. No outbound notifications, attachments, live chat, agent assignment, SLA tooling, or refund/return execution are included. Guest users retain only the displayed reference and cannot list history through an account.

## 26. Phase 8 prerequisites

Confirm the production origin/proxy headers, select a shared rate-limit provider, and decide whether Phase 8 should add outbound notifications, attachment storage, or another approved capability. Keep those features outside Phase 7.
