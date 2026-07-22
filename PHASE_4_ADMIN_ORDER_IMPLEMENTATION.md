# Phase 4 Admin Order Implementation

## 1. Phase summary
Phase 4 adds database-backed admin order operations, controlled status progression, private notes, safe cancellation, customer tracking, and operational dashboard counts. Payment processing was not added.

## 2. Admin order architecture
All admin order APIs use the existing database-backed `requireAdmin` path through `authorizeAdminRequest`. `adminOrderService` owns listing, detail mapping, transitions, cancellation, notes, and statistics.

## 3. Status transition map
Transitions are centralized in `orderTransition.js`. Terminal, backward, same-status, unknown, and otherwise unsupported transitions are rejected server-side.

## 4. Fulfilment-specific rules
Delivery orders cannot enter `READY_FOR_PICKUP`; pickup orders cannot enter `OUT_FOR_DELIVERY`. `OUT_FOR_DELIVERY` cancellation is disabled.

## 5. Payment-aware rules
COD and Pay at Store may progress while payment remains pending. Online orders cannot operationally progress unless payment status is `PAID`. Phase 4 never changes payment status.

## 6. Cancellation rules
Eligible pre-delivery statuses can be cancelled with a mandatory reason. Delivered, out-for-delivery, refunded, failed, and terminal orders are rejected. Sequential repeated cancellation returns the existing cancelled order.

## 7. Inventory restoration strategy
Every retained product receives its item snapshot quantity in the cancellation transaction. One `ORDER_CANCELLATION` movement records previous/new stock, order reference, and admin actor.

## 8. Idempotency strategy
`inventoryRestoredAt` is the durable restoration marker. A guarded order update requires the original status and a null restoration timestamp, preventing duplicate restoration/history.

## 9. Concurrency strategy
Mutations use serializable Prisma transactions and conditional status updates. Stale competing changes fail rather than overwriting a newer status.

## 10. Admin APIs created
List, detail, status, cancel, private-note, and statistics routes were added under `/api/admin/orders`.

## 11. Admin pages created
`/admin/orders` provides responsive search/filter/sort/pagination. `/admin/orders/[orderNumber]` provides full details, valid actions, notes, timeline, cancellation, and restoration state.

## 12. Customer pages updated
My Orders shows current status, fulfilment, latest visible note, and update time. Order detail shows the real delivery/pickup timeline and cancellation safely.

## 13. Prisma changes
Order gained operational timestamps, cancellation reason, and inventory restoration timestamp. OrderStatusHistory gained `isCustomerVisible`.

## 14. Migration name
`20260722193000_admin_order_workflow`

## 15. Commands executed
Prisma format, validate, migration diff/deploy, generate, production build, and isolated Phase 4 verification script.

## 16. Tests performed
Unauthenticated `401`, customer `403`, admin `200`, valid confirmation, cancellation, repeated cancellation, one stock restoration, and one cancellation movement were database-backed and automatically cleaned up.

## 17. Build result
The Next.js production build passes with all admin/customer pages and APIs.

## 18. Manual actions required
Promote the intended production administrator using the existing Phase 2 admin promotion procedure. Review operational copy and permissions with store staff.

## 19. Known limitations
No payment verification/refunds, notifications, customer cancellation, delivery agents, invoices, or advanced analytics. Product-less archived items cannot be restored and remain documented by their snapshots.

## 20. Phase 5 prerequisites
Introduce verified payment attempts, signatures/webhooks, reconciliation, reservation expiry, and refund orchestration without trusting browser payment results.
