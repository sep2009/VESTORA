# Cart, accounts, checkout, payments and orders

## What exists
| Area | Where |
|---|---|
| Cart (persisted on the device, validated by the server) | `stores/cart-store.ts`, `components/commerce/CartView.tsx`, `/cart`, header drawer |
| Accounts: register, sign in/out, password recovery, profile, addresses, orders, favorites | `server/commerce/customers.ts`, `/api/auth/*`, `/api/account/*`, `/account/*` |
| Checkout (5 steps + confirmation) | `components/commerce/CheckoutFlow.tsx`, `/api/checkout`, `/checkout/confirmation/[id]` |
| Payment provider architecture | `server/payments/` (interface, Stripe adapter, test sandbox, webhook handler) |
| Orders and inventory | `server/commerce/orders.ts` |
| Admin order management | `/admin/orders`, `/api/admin/orders*` |
| Database drafts | `supabase/migrations/0003_commerce.sql` (not run) |

## Rules the system keeps
- **The server prices everything.** `/api/cart/validate` and `/api/checkout` read price, variant and stock from the database; prices sent by the browser are ignored. Totals: list price, discounts (sale price savings), shipping, total. Taxes are not calculated, and there are no coupon codes.
- **An order is never "paid" because the browser says so.** `POST /api/checkout` creates an order that is *awaiting payment*, holds its stock for 30 minutes and opens the provider's page. Only a verified provider webhook marks it paid. The confirmation page shows "waiting" until then, and the cart is emptied only after a confirmed payment.
- **Webhooks** (`/api/payments/webhook/[provider]`): signature checked on the raw body first (Stripe: `Stripe-Signature` HMAC with a 5-minute replay window; sandbox: HMAC header). The amount and currency must match the order, otherwise it is flagged and not paid. Each provider event id is processed once (duplicates are acknowledged and ignored). Paid, failed, cancelled, pending and expired are handled; a failure after payment is ignored.
- **Inventory**: availability = stock minus units held by other pending orders. Stock is subtracted when the paid webhook arrives, inside the same serialised write. If stock vanished meanwhile, the order is flagged *needs attention / refund required* and stock is never negative. Cancelling a paid order restores stock and flags a refund (this system does not move money).
- **Idempotent checkout**: the browser sends a key; a double click returns the open order. A failed, cancelled or expired attempt does not block a retry.
- **Guests** open their order with a token in the confirmation link (HMAC of the order id). Signed-in customers need no token. Internal notes are never shown to customers.

## Accounts and security
Passwords: scrypt hashes, 10+ characters, weak ones refused. Sessions: HttpOnly, SameSite=Lax cookie, HMAC-signed, 14 days, a different key from the admin cookie, invalidated by a password change or reset. State-changing calls need the `X-Vestora-CSRF` header and a same-origin `Origin`. Rate limits (per IP, in memory): sign-in, registration, reset, checkout; accounts lock for 15 minutes after 8 wrong passwords. "Forgot password" answers identically whether or not the email exists; the reset token is random, stored hashed, valid one hour, single use.

## Who can buy what
Demo products can be bought only with the test provider. Affiliate-feed products are sold by another seller (the cart links to them and checkout refuses them). Products need tracked variant stock to be sold here.

## Environment
| Variable | Purpose |
|---|---|
| `SESSION_SECRET` (32+ chars) | signs customer, admin and order-token values |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | enables Stripe Checkout. Webhook URL: `<site>/api/payments/webhook/stripe` (events: `checkout.session.completed`, `.async_payment_succeeded`, `.async_payment_failed`, `.expired`) |
| `PAYMENT_WEBHOOK_SECRET` (16+ chars) | enables the **test sandbox** (no real money). In production it also needs `ALLOW_TEST_PAYMENTS=1` |
With none of these set, checkout says payments are not configured and refuses to create orders.

## Tests (production build, test provider, demo data)
- `node scripts/e2e-commerce.mjs`: **95 checks pass**: cart validation (stock, price tampering, discount, shipping), accounts (registration rules, login, lockout, tampered or cross-used cookies, CSRF, profile, addresses, favorites, reset flow and session invalidation), checkout validation, order lifecycle (pending → paid, failed, cancelled, pending), webhook rejection (bad/missing signature, wrong amount, unknown provider), duplicates, no double stock decrement, reservations, 6 concurrent buyers for 1 unit (1 wins), stock never negative, paid-without-stock flagging, signed-in history and privacy, admin search/filter/fulfilment/cancel/delete and editor limits.
- `node scripts/test-stripe-webhook.mjs`: 14 checks pass (signature, replay, tamper, event mapping).
- Browser: from the 3D showroom (View details → size and color → add to cart) → cart drawer → variant change → quantity → five checkout steps with validation messages → test payment page: failed (cart kept), left pending ("awaiting payment", not confirmed), paid (confirmed, cart emptied) → admin order list, status and tracking update. Registration and sign-in in the UI; mobile (375 px) shows no horizontal overflow.

## Not done / needs you
- **No real payments.** The Stripe adapter is written but has **never run against Stripe**; it needs your account keys and a webhook. Test it in Stripe test mode first.
- **No email.** Reset links and order emails are recorded in the `outbox` database table and the console; connect a mail provider in `deliverEmail`. Until then the confirmation page says email is "once delivery is configured".
- Tax, coupon codes, refunds through a provider, order cancellation by customers, returns, invoices and shipping carrier integration are not built. Shipping prices and countries are fixed in `modules/commerce/shipping.ts` and `types.ts`.
- File store: one server instance. Production on Supabase needs an adapter for `server/commerce`; the schema and atomic stock function are drafted but untested.
- Rate limits and the login throttle are in memory.
- Not browser-tested: the account addresses and profile pages, password reset through the UI, the product page cart drawer on touch devices.
