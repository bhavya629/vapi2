# Phase 8 Account Security and Customer Management

## 1. Phase summary

Phase 8 adds database-backed sessions, login/security events, recent-password reuse prevention, hardened authentication, customer profile/security APIs, active-session management, and admin customer operations. No reset email, OTP, 2FA, social login, impersonation, customer deletion, or marketing feature was added.

## 2. User schema changes

`User` now has `status`, login/password timestamps, failed-login state, lock expiry, and suspension metadata. Existing users receive `ACTIVE`. Relations were added to `Session`, `AuthEvent`, and `PasswordHistory`; commerce/support relations were not changed or deleted.

## 3. Session architecture

Every new login/signup creates a `Session`. The database stores only a SHA-256 hash of the random token identifier, privacy-hashed IP, bounded user agent, safe device label, timestamps, expiry, and revocation metadata. Authorization rejects missing, expired, or revoked tracked sessions. `lastUsedAt` writes are throttled to once per ten minutes.

## 4. JWT/jti strategy

The existing signed HttpOnly JWT remains the cookie transport and now includes a 256-bit random `jti`. The server hashes `jti` before lookup and reloads role/status from PostgreSQL. JWT role is never authorization authority.

## 5. Legacy session migration strategy

JWTs without `jti` are temporarily accepted when `ALLOW_LEGACY_AUTH_TOKENS` is not `false`. New login/signup always issues tracked sessions. After the existing seven-day cookie window, set `ALLOW_LEGACY_AUTH_TOKENS=false` and restart all instances.

## 6. Login-event architecture

`AuthEvent` records sanitized login success/failure, logout, password change, session revocation, profile change, suspension, and reactivation events. It stores no password, cookie, raw token, or raw IP. Customer history hides internal failure details.

## 7. Password policy

Passwords require 10–128 characters, uppercase, lowercase, number, and symbol; leading/trailing whitespace and common weak values are rejected. Passwords containing recognizable full name/email components are rejected. bcrypt cost 12 is preserved.

## 8. Password history strategy

`PasswordHistory` stores bcrypt hashes only. Change-password compares against the current hash and three latest history hashes. New registrations seed initial history; existing users begin accumulating history on their first Phase 8 change.

## 9. Password-change flow

The active session is authenticated, body fields are allow-listed, current password and confirmation are verified, policy/history are checked, and the password/timestamp/history/session revocations commit transactionally. A fresh current-device session and cookie are then issued; all older sessions remain revoked.

## 10. Session revocation flow

Customers can list only their active sessions, revoke an owned individual session idempotently, or revoke every other session while preserving the current one. Revoking the current device clears the cookie. Suspension and password change revoke all existing sessions.

## 11. Account-lock strategy

Five recent failed logins place the account in `LOCKED` for 15 minutes. Login responses remain generic. A successful login after expiry clears counters, timestamps, lock expiry, and returns status to `ACTIVE`. Locking affects new login attempts; existing active tracked sessions remain usable.

## 12. Account-suspension strategy

Only an authenticated administrator can suspend/reactivate a `CUSTOMER`. Suspension requires a reason, preserves every related record, revokes all active sessions, and writes both an auth event and admin audit log. Suspended accounts cannot log in or use protected APIs. Internal reasons are never returned to customer endpoints.

## 13. Customer profile APIs

`GET /api/account/profile` returns safe real profile data, verification flags, default-address summary, and order/wishlist/enquiry/address counts. `PATCH` accepts only normalized `name` and optional Indian `phone`; email, role, status, and unknown fields are rejected.

## 14. Session APIs

- `GET /api/account/sessions`
- `DELETE /api/account/sessions/[sessionId]`
- `DELETE /api/account/sessions` (revokes other devices)

Responses omit token hash, raw JWT, IP, and full user agent.

## 15. Login-history API

`GET /api/account/login-history` returns at most 20 owned, sanitized security events with a safe device label and timestamp.

## 16. Admin customer APIs

- `GET /api/admin/customers`
- `GET /api/admin/customers/[identifier]`
- `PATCH /api/admin/customers/[identifier]/status`
- `GET /api/admin/customers/[identifier]/activity`

They provide controlled filtering/pagination and safe aggregates without password, session, IP, JWT, or payment-secret fields.

## 17. Account-page integration

The existing account design now loads real counts, keeps email read-only, enforces the new password form policy, displays active sessions/current-device state, supports per-device and bulk revocation, and shows recent sanitized login activity.

## 18. Admin-page integration

The existing admin layout now includes Customers. `/admin/customers` provides search, status/date/order filters, sorting, pagination, desktop table and mobile cards. `/admin/customers/[customerId]` shows safe account/contact/statistics/order/address/enquiry/payment/session/security summaries and a reason-required suspension flow.

## 19. Rate-limit strategy

The Phase 7 sliding-window abstraction protects login (10/15 minutes per IP+email), signup (5/hour per IP), password change (5/hour), profile updates (20/hour), and session revocation (20/hour). It remains process-local and must be replaced by a shared store before horizontal scaling.

## 20. Cookie security

Authentication cookies are `HttpOnly`, `SameSite=Lax`, `Path=/`, seven-day maximum age, and `Secure` in production. Cookie clearing uses matching security/path attributes. Tokens are never exposed to browser JavaScript.

## 21. IP/privacy strategy

IP values are HMAC-SHA256 hashed with the application JWT secret. Exact IP and location are never stored or displayed. Full user agents are bounded in storage and never returned; UI receives only a derived device label. Retain auth events for 90–180 days and later add a reviewed cleanup job.

## 22. Migration name

`20260723010000_customer_account_security_admin_management` — applied successfully without reset or destructive schema commands.

## 23. Commands executed

`npx prisma format`, `npx prisma validate`, `npx prisma migrate dev --create-only`, `npx prisma migrate deploy`, `npx prisma generate`, Prettier formatting, API smoke checks, `npx prisma migrate status`, and `npm run build`.

## 24. Tests performed

Verified unauthenticated profile, session, and admin-customer endpoints return 401; invalid login input returns 400; migration status reports the schema current; Prisma validation/client generation pass; production compilation and all 35 page generations pass. Reviewed query projections to confirm password/session/IP secrets are absent. Full credential-dependent password, customer-role 403, multi-device, and suspend/reactivate browser scenarios require dedicated test accounts.

## 25. Build result

PASS — Next.js 16.2.10 production build completed successfully.

## 26. Manual actions required

Set `ALLOW_LEGACY_AUTH_TOKENS=false` after the seven-day transition window. Configure a shared rate-limit backend before multi-instance production. Run browser acceptance tests using dedicated customer/admin accounts and multiple devices. Establish a reviewed 90–180 day AuthEvent retention job.

## 27. Known limitations

Rate limits are process-local. Legacy JWTs cannot appear as a current row in the session list until re-login. Existing users have no historical password hashes before their first Phase 8 change. No email reset/verification, 2FA, OTP, passkey, social login, IP geolocation, customer deletion, impersonation, or automated event cleanup exists.

## 28. Phase 9 prerequisites

Complete the legacy-token cutoff and shared rate-limit selection, verify proxy/origin headers, approve security-event retention, and explicitly select the next phase scope. Do not infer notification, reset-email, 2FA, or other identity features without approval.
