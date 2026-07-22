# Phase 6 Wishlist Implementation

## 1. Phase summary
Authenticated wishlists are stored in PostgreSQL while guests retain a local, mergeable wishlist. Existing cards/details/Navbar continue through the refactored shared context.

## 2. Wishlist database model
`WishlistItem` relates one User to one Product with server timestamps and a composite uniqueness constraint.

## 3. Database migration
`20260722230000_database_customer_wishlist` was safely deployed without deleting existing records.

## 4. User/Product relations
Both models expose `wishlistItems`; user/product deletion cascades only the join rows.

## 5. Guest wishlist storage format
Key `tcs_guest_wishlist_v2` stores `{version:2,items}` with normalized identifiers and temporary display cache, capped at 200.

## 6. Legacy localStorage migration
The old `cellphoneStudioWishlist` array is parsed defensively, normalized, deduplicated, saved to v2, and removed only after successful storage.

## 7. Authentication merge flow
When cookie-backed AuthContext exposes a user, up to 100 guest identifiers are merged idempotently, database items refresh, and guest storage clears only after API success.

## 8. Logout behavior
Authenticated memory is replaced with a fresh guest read. Database rows remain and are never copied to guest storage.

## 9. API routes created
Owned list/add/clear, remove, toggle, merge, and batch-status endpoints were added under `/api/wishlist`.

## 10. Wishlist context architecture
One context supports guest storage and authenticated API authority, optimistic updates, rollback, per-product mutation locks, refresh, merge, clear, membership, readiness, count, and errors.

## 11. Product-card integration
All existing product cards already use this context, so heart state and accessible toggle behavior now synchronize with database state after authentication.

## 12. Product-detail integration
Smartphone and accessory details retain the shared context toggle and now receive authenticated membership state without per-card requests.

## 13. Wishlist-page integration
Authenticated items use current relational product data. Guest items remain viewable without forced login. The existing design and sorting remain.

## 14. Add-to-cart behavior
CartContext now rejects explicitly inactive or out-of-stock products. Adding an available item does not remove it from the wishlist.

## 15. Availability handling
Current price, image, active state, physical-minus-reserved stock, and low-stock state are mapped on each authenticated wishlist read. Inactive entries remain removable.

## 16. Wishlist limit
Authenticated wishlists are capped at 200; guest lists at 200; merge requests at 100.

## 17. Optimistic UI strategy
The context updates immediately, locks the product mutation, refreshes from the server on success, and rolls back with a safe toast on failure.

## 18. Authorization strategy
Every API derives user ID from the verified HttpOnly cookie and scopes reads/deletes by that ID. Browser `userId` fields are rejected.

## 19. Performance strategy
Listing loads Product/Brand/Category in one paginated relational query. Membership status uses one batch query. Context prevents per-card wishlist fetches.

## 20. Tests performed
Database/API verification covers authentication, body manipulation, active/inactive products, duplicate add, cross-user deletion isolation, batch status, merge, and composite uniqueness.

## 21. Commands executed
Prisma format/validate/diff/deploy/generate, isolated verification, and production build.

## 22. Build result
Production build passes.

## 23. Manual actions required
Test guest legacy migration and login/signup merge in supported browsers, including private-storage restrictions and two customer accounts.

## 24. Known limitations
Guest missing-product metadata is not refreshed until the product is encountered again or merged. No notifications, named/shared wishlists, recommendations, or admin customer analytics exist.

## 25. Phase 7 prerequisites
Choose the next explicitly approved customer feature and preserve catalogue authority, ownership checks, pagination, and wishlist/cart separation.
