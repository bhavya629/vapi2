# Phase 9 Product Review System

## Architecture

Phase 9 adds one shared review service used by public product reviews, authenticated customer mutations, customer history, and database-authorized admin moderation. Review content is rendered as React text. All ownership, purchase eligibility, moderation, and analytics decisions are server-side.

## Database

- `Review` stores product, customer and qualifying order relations, rating, title, comment, moderation state, verified-purchase flag, helpful/report counters and timestamps.
- `ReviewVote` stores one helpful decision per customer/review.
- `ReviewReport` stores one report per customer/review.
- `ReviewStatus`: PENDING, APPROVED, REJECTED, HIDDEN.
- `Product` caches `averageRating`, `totalReviews`, and the five rating-distribution counters. Existing `rating`/`reviewCount` fields are synchronized for compatibility.
- Unique constraints enforce one review per user/product, one vote per user/review, and one report per user/review.

## APIs

Customer/public:

- `GET /api/reviews/product/[productId]`
- `POST /api/reviews`
- `PATCH /api/reviews/[id]`
- `DELETE /api/reviews/[id]`
- `POST /api/reviews/[id]/vote`
- `POST /api/reviews/[id]/report`
- `GET /api/account/reviews`

Admin:

- `GET /api/admin/reviews`
- `GET /api/admin/reviews/[id]`
- `PATCH /api/admin/reviews/[id]`
- `DELETE /api/admin/reviews/[id]`

## Customer Flow

A signed-in customer may submit only when PostgreSQL contains an owned order with `DELIVERED` status, `PAID` payment status, and an order item related to the requested product. The server chooses the qualifying order; the browser cannot supply it. New/edited reviews become PENDING. Customers can edit/delete only their review, see its status under My Reviews, vote another approved review helpful, and report another approved review.

## Admin Flow

The existing admin layout contains Reviews. The list provides search, status/rating/verified/product/customer/date filters, sorting and pagination. Detail shows safe product/customer/order context and reports. Admin may approve, reject, hide, return to pending, or permanently delete a review. Each moderation/deletion action creates an `AdminAuditLog`.

## Moderation

Only APPROVED reviews appear publicly or contribute to ratings. Editing an approved review returns it to PENDING and immediately removes its contribution. REJECTED/HIDDEN content stays available to admin and its owner but is absent from public responses. Admin APIs require the existing database-backed ADMIN authorization.

## Analytics

`recalculate` runs transactionally after create, edit, customer deletion, moderation, and admin deletion. It groups APPROVED reviews by rating and updates average, total, 1–5 star counts, plus compatibility fields in the same transaction. Product listing/detail mappers use the production cache. Admin dashboard exposes pending, hidden and average rating metrics plus latest reviews.

## Spam Protection

Database uniqueness prevents duplicate reviews/votes/reports. Existing process-local sliding-window limits protect create, edit/delete, helpful votes and reports. Strict field allow-lists and 1–5, title 5–100, comment 20–2000, report 5–500 validation are enforced server-side. A shared rate-limit store remains required before horizontal scaling.

## Migration

Migration: `20260723013000_production_product_review_system`. It was generated and applied without reset, destructive migration commands, or changes to existing order/customer/catalogue records.

## Testing

Prisma format, validation, migration deployment/status and client generation passed. The production build compiled and generated all review routes/pages. Public product-review returned 200 from the production server; unauthenticated customer/admin boundaries returned 401. Service paths were reviewed for delivered/paid purchase qualification, unique ownership constraints, moderation-only public visibility, rating-cache transactions, pagination and sorting. Credential-dependent verified-order, edit/delete, vote/report and moderation acceptance still requires dedicated customer/admin fixtures.

## Build Result

PASS — Next.js 16.2.10 production build completed successfully after Phase 9 integration.

## Manual Steps

Use dedicated test accounts to deliver and mark a paid test order, submit a review, moderate it, and confirm rating cache changes across listing/detail cards. Configure shared Redis/Upstash rate limiting before multi-instance deployment. No Phase 10 work was started.
