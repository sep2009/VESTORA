# Deployment and production readiness

**Status: not production-ready.** The application is complete and tested against demo data and test providers, but real payments, email, a shared database, product data and AI providers are NOT configured. Read "Blocking requirements" before going live.

## Blocking requirements (nothing here is done for you)
1. **A real database.** Today all data (products, accounts, orders, try-on jobs, style profiles) lives in JSON files under `data/` on one server. That is for development and a single small instance. Production needs the Supabase schema (`supabase/migrations/0002`, `0003`: **written, never run**) and a repository adapter in `src/server/store` and `src/server/commerce` (**not written**). Until then deploy only to a host with a persistent disk and exactly one instance.
2. **A payment provider.** Stripe Checkout is implemented (`src/server/payments/stripe.ts`) but **has never run against Stripe**. Without `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` checkout refuses to take orders. Do not enable `PAYMENT_WEBHOOK_SECRET`/`ALLOW_TEST_PAYMENTS` in production (the test sandbox moves no money).
3. **Email.** Password resets and order emails are written to `data/db/outbox.log`. Connect a mail service in `deliverEmail` (`src/server/commerce/customers.ts`) before launch, or customers cannot recover passwords.
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
| `VESTORA_DATA_DIR`, `VESTORA_UPLOAD_DIR`, `VESTORA_PRIVATE_DIR`, `VESTORA_SEED_FILE` | optional | Where data, public uploads (images, models) and private try-on files live. Put them on a persistent, backed-up volume. |
| `RATE_LIMIT_SCALE` | **tests only** | Never set in production. |
Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Never commit `.env.local` (it is git-ignored). `scripts/audit-security.mjs` fails if any secret value appears in the client bundle or rendered pages.

## Database migrations (Supabase, when you adopt it)
1. Create a Supabase project. Run `supabase/migrations/0002_catalog_admin.sql`, then `0003_commerce.sql` in the SQL editor (or `supabase db push`). **They have never been executed**: expect to fix errors, and review every row-level-security policy with a real test before trusting it (customers see only their own orders; only the service role creates orders and commits stock).
2. Write the repository adapter (the file-store functions in `src/server/store/db.ts` and `src/server/commerce/*` define the interface) and port `scripts/e2e-commerce.mjs` to it.
3. Set `NEXT_PUBLIC_SUPABASE_*` only for the anon key and URL; the service-role key stays server-only.

## Storage
- Public uploads (`data/uploads`): product images (PNG/JPEG/WebP/GIF/AVIF, 5 MB) and 3D models (GLB/glTF 2.0, 25 MB), validated by bytes, served through an allow-listed path with `nosniff` and a sandbox CSP. On Supabase use the `product-images` and `product-models` buckets from migration 0002.
- Private try-on files (`data/private/tryon`): photos and generated images, mode 0700/0600, never served statically, deleted by retention rules (photo ≤ 60 min, results 24 h / 30 d if saved). On Supabase or S3 use private buckets with signed URLs and server-side encryption.

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
- Run behind HTTPS (the app sets HSTS and a Content-Security-Policy in production). One instance only until the database adapter exists.
- Set `NODE_ENV=production`; do not run `next dev`.
- Health check: `GET /api/health`.
- Before release run the suite against a staging server started with the production build: `npm test` (see `docs/AUDIT.md`).

## Backups
- Back up `data/db` (store, audit log, style profiles), `data/uploads` and `data/private` nightly to separate storage; test a restore. `data/private` holds personal photos: encrypt backups and keep them as short-lived as the retention policy.
- With Supabase use point-in-time recovery and storage bucket versioning.
- Keep the audit log (`data/db/audit.log`) with the database backup.

## Monitoring to add
Error tracking, uptime checks on `/api/health`, payment webhook failure alerts, disk usage on the data volume, and log retention that excludes photo bytes and chat text (the app does not log them).
