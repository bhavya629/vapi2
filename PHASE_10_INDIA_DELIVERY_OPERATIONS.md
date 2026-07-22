# Phase 10 — India Delivery Operations

## 1. Scope

India-wide delivery, 50 km local classification, same-day eligibility and delivery operations only.

## 2. Fixed local delivery charge

Every delivery within the configured 50 km radius costs ₹350. There is no free-delivery threshold.

## 3. Store configuration

Administrators configure the store address, exact coordinates, radius, cutoff and feature flags in `/admin/delivery-settings`.

## 4. Coordinate policy

Coordinates are nullable. The system never guesses them; missing store or customer coordinates produce `NEEDS_VERIFICATION`.

## 5. Distance calculation

`server/delivery/distance.js` uses the Haversine formula and returns kilometres rounded to two decimals.

## 6. Boundary rule

Distances less than or exactly equal to 50 km are local. Distances above 50 km are outstation.

## 7. Same-day cutoff

The default cutoff is 15:00 in Asia/Kolkata and can be changed by an administrator.

## 8. Same-day eligibility

Eligibility requires local classification, the same-day feature flag and placement before the cutoff.

## 9. Outstation workflow

Outstation orders start with a pending shipping charge and await delivery-manager confirmation.

## 10. Unverified workflow

Orders with missing coordinates start in `AWAITING_DISTANCE_VERIFICATION` and cannot receive the local charge automatically.

## 11. Customer contact

Every phone, WhatsApp, SMS or email contact can be appended to an immutable delivery contact log.

## 12. Shipping confirmation

A positive charge, channel and explicit customer-consent record are required for outstation confirmation.

## 13. Online payment gate

Razorpay creation is blocked until an outstation shipping charge is confirmed and the order total is recalculated.

## 14. Captured payment safety

Shipping confirmation refuses changes after payment is captured.

## 15. COD handling

COD orders include ₹350 locally. Outstation COD totals are recalculated only after customer confirmation.

## 16. Inventory handling

Normal online orders retain short reservations. Confirmation-pending outstation orders deduct inventory when the database order succeeds.

## 17. Address validation

Addresses require an Indian state or union territory, a six-digit PIN and a valid Indian mobile number.

## 18. Address snapshot

The complete delivery address, including coordinates when supplied, is snapshotted on the order.

## 19. Delivery manager role

`DELIVERY_MANAGER` can access delivery operations but not catalogue, customer security or general admin permissions.

## 20. Automatic assignment

Orders are automatically assigned only when exactly one active delivery manager exists.

## 21. Delivery dashboard

`/delivery` shows assigned/unassigned work plus delivery revenue, recorded costs and profit.

## 22. Delivery order list

`/delivery/orders` provides status-filtered operational work queues.

## 23. Delivery order detail

Managers can assign, verify distance, update status, record confirmation, courier data and customer contact.

## 24. Earnings

`/delivery/earnings` aggregates delivery revenue, packaging/courier/other costs and derived profit.

## 25. Status history

Every delivery transition appends a timestamped actor record; customer visibility is explicit.

## 26. Courier tracking

Courier name, tracking number and tracking URL are stored independently on the order snapshot.

## 27. Internal cost privacy

Packaging, courier, other costs, profit and internal contact logs are exposed only to delivery operators and admins.

## 28. Customer tracking

Customer order detail exposes safe delivery status, public notes, courier tracking and customer-visible history only.

## 29. Admin visibility

Admin order DTOs include zone, distance, manager, confirmation, delivery history and operational costing.

## 30. API security

Mutation APIs enforce authenticated roles, same-origin checks, constrained fields and server-side amount computation.

## 31. Idempotency

Order idempotency remains enforced. Shipping confirmation is unique per order and safely returns the existing record.

## 32. Operational setup

Set real store coordinates, create one active delivery-manager account for Bhavya, and verify the cutoff before production use.

## 33. Phase boundary

No route optimization, carrier integrations, delivery coupons, free-delivery rules or Phase 11 features are included.
