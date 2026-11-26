# Deployment and production readiness

**Status: not production-ready.** The application is complete and tested against demo data and test providers, but real payments, email, a shared database, product data and AI providers are NOT configured. Read "Blocking requirements" before going live.

## Blocking requirements (nothing here is done for you)
1. **Database.** PostgreSQL (Netlify Database) is implemented: see `docs/DATABASE.md`. Either enable Netlify Database (it provides `NETLIFY_DB_URL`; credit-based plans) or set `DATABASE_URL` to another PostgreSQL, such as a free Neon project. The schema and the demo seed apply automatically on first use. The Supabase SQL under `supabase/migrations` is an older, unused draft.
2. **A payment provider.** Stripe Checkout is implemented (`src/server/payments/stripe.ts`) but **has never run against Stripe**. Without `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` checkout refuses to take orders. Do not enable `PAYMENT_WEBHOOK_SECRET`/`ALLOW_TEST_PAYMENTS` in production (the test sandbox moves no money).
3. **Email.** Password resets and order emails are written to the `outbox` table. Connect a mail service in `deliverEmail` (`src/server/commerce/customers.ts`) before launch, or customers cannot recover passwords.
4. **Real products and rights.** The 72 products are labelled demo data with drawn placeholders. Import real products with licensed images (non-demo records require a source URL, price, image and licence).
5. **AI providers (optional).** The stylist and photo try-on work without any provider (rules; try-on shows "unavailable"). No real adapter exists. See `docs/ASSISTANT.md` and `docs/TRYON.md` before choosing one.

## Environment variables (server-only unless noted; none uses `NEXT_PUBLIC_`)
| Variable | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | yes | 32+ random characters. Signs admin and customer cookies and order links. Rotating it signs everyone out. |
| `ADMIN_PASSWORD_HASH` | yes (for admin) | From `node scripts/hash-password.mjs "long password"`. |
| `EDITOR_PASSWORD_HASH` | optional | Second role: products, stock, uploads only. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | for real payments | Webhook URL `https://<site>/api/payments/webhook/stripe` (events `checkout.session.completed`, `.async_payment_succeeded`, `.async_payment_failed`, `.expired`). |
| `PAYMENT_WEBHOOK_SECRET`, `ALLOW_TEST_PAYMENTS` | dev only | Test sandbox. Leave unset in production. |
| `TRYON_PROVIDER` (+ provider credentials) | optional | Empty = photo try-on shown as unavailable. `test` = labelled development provider (needs `ALLOW_TEST_TRYON=1` in production; do not). |
| `ASSISTANT_PROVIDER` (+ credentials) | optional | Empty = rule-based stylist. `test` = scripted development provider (not AI; `ALLOW_TEST_ASSISTANT=1` needed in production; do not). |
| `TRYON_DAILY_LIMIT`, `TRYON_RATE_PER_HOUR`, `TRYON_TIMEOUT_MS`, `TRYON_POLL_MS`, `ASSISTANT_TIMEOUT_MS`, `ASSISTANT_RATE_PER_MIN` | optional | Limits and timeouts. |
| `NETLIFY_DB_URL` or `DATABASE_URL` | **yes** | PostgreSQL connection string. `NETLIFY_DB_URL` is provided automatically by Netlify Database. Without it the production app answers 503 and `/api/health` reports `not_configured`. |
| `DB_POOL_MAX` | optional | Connections per function instance (default 3). |
| `VESTORA_DB=pglite` | **local only** | Lets a production build use the in-memory PGlite engine for verification. Never set on Netlify. |
| `RATE_LIMIT_SCALE` | **tests only** | Never set in production. |
Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Never commit `.env.local` (it is git-ignored). `scripts/audit-security.mjs` fails if any secret value appears in the client bundle or rendered pages.

## Database
See `docs/DATABASE.md` (schema, migrations, seeding, backups, local testing). In short: enable Netlify Database, set the variables above, deploy, open `/api/health` and confirm `database.engine` is `postgres`.

## Storage
All files live in PostgreSQL: public uploads (product images up to 5 MB, 3D models up to 25 MB, validated by bytes, served by `/api/uploads/...` with `nosniff` and a sandbox CSP) in the `uploads` table, and private try-on photos and results (never public, deleted by retention rules) in `private_files`. Nothing is written to the filesystem at runtime, which is what serverless hosts require. For large media volumes move `uploads` to object storage (Netlify Blobs or S3) later.

## 3D asset requirements
- Product models: GLB (preferred) or embedded glTF 2.0, Draco or meshopt compression, ≤ 25 MB and ≤ 1.5 M triangles (larger files are refused with a message), PBR materials, textures ≤ 2048 px, real-world scale, origin at the base, one product per file, licence recorded on the product. Compress with `gltf-transform` before upload.
- No real product GLB exists yet; only a generated test fixture is attached to one product in the development database.
- Avatar and garment fitting: preview mode uses procedural shapes (`docs/OUTFIT_STUDIO.md`). A real fitting solution needs rigged avatars plus garments authored for the same skeleton.

## Build, run, deploy
```bash
npm ci
npm run build          # type checks and compiles
npm run start          # next start -p 3000 behind a TLS-terminating proxy
```
- Run behind HTTPS (the app sets HSTS and a Content-Security-Policy in production). Multiple instances are safe: all state is in PostgreSQL (rate limits and login throttles are still per instance).
- Set `NODE_ENV=production`; do not run `next dev`. On Netlify, `netlify.toml` sets the build.
- Health check: `GET /api/health`.
- Before release run the suite against a staging server started with the production build: `npm test` (see `docs/AUDIT.md`).

## Backups
- Back up the PostgreSQL database (Netlify Database / Neon: use branching and point-in-time restore; also export `pg_dump` nightly to separate storage and test a restore). The database holds personal data and try-on photos: encrypt backups and keep them no longer than the retention policy.
- The `audit_log` table is included in database backups.

## Monitoring to add
Error tracking, uptime checks on `/api/health`, payment webhook failure alerts, disk usage on the data volume, and log retention that excludes photo bytes and chat text (the app does not log them).
