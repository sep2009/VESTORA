# Database (PostgreSQL / Netlify Database)

All persistent data lives in PostgreSQL. **Nothing is written to, or read from, the filesystem at runtime** (the old `data/db/store.json`, `data/uploads` and `data/private` are gone). That was the cause of the Netlify HTTP 500: a serverless filesystem is read-only, so the first request that tried to create or update the JSON store failed.

## Connection
- Production: `NETLIFY_DB_URL` (provided by Netlify Database), or `DATABASE_URL` for any other PostgreSQL such as a free Neon project; the older name `NETLIFY_DATABASE_URL` also works. The first one set, in the order `NETLIFY_DB_URL`, `NETLIFY_DATABASE_URL`, `DATABASE_URL`, is used.
- The app applies its own migrations (`src/server/db`), not Netlify's `netlify/database/migrations` system, which Netlify documents as optional. Driver: `pg` with a small pool (`DB_POOL_MAX`, default 3) and TLS.
- No connection string in production = a clear configuration error: API calls answer **503** "temporarily unavailable", `/api/health` returns `{"ok":false,"database":{"error":"not_configured"}}`, and the server log says why. Nothing is faked.
- Development and tests without a connection string use **PGlite**, a real PostgreSQL engine in WebAssembly, in memory (`PGLITE_DATA_DIR` optionally keeps data between restarts). `VESTORA_DB=pglite` allows it with a production build for local verification. Never set it on Netlify.

## Schema (`src/server/db/schema.ts`, applied automatically and recorded in `schema_migrations`)
| Table | Contents |
|---|---|
| `brands`, `categories`, `collections`, `departments` | Catalog taxonomy (key, order, validated JSON record) |
| `products` | One row per product: `id`, `slug` (unique), `brand`, `department`, `category`, `availability`, `price_amount`, `currency` (indexed) + the validated record (`data` JSONB: variants, images, 3D model, source…) |
| `showroom_slots`, `showroom_assignments` | **3D mall layout**: fixtures per department and which product is pinned to which fixture |
| `users`, `orders`, `reset_tokens`, `payment_events` | Accounts, orders (indexed by user, status, payment status, idempotency key), password-reset tokens (hashed), webhook de-duplication |
| `audit_log` | Admin and system changes (actor, action, time) |
| `outbox` | Emails the app wanted to send (no mail provider yet) |
| `uploads` | Admin-uploaded product images and 3D models (`bytea`) |
| `private_files`, `tryon_jobs`, `tryon_usage` | Try-on photos/results (private), job records, daily usage counters |
| `style_profiles` | Saved style-quiz answers and personalization choices |
| `meta` | `seeded` flag and `store_version` counter |
Domain records keep their validated shape in JSONB (the zod schemas in `src/modules` are the source of truth and are re-checked on every load); keys, relations and filter columns are real columns.

## How reads and writes work
- **Reads** (`readStore`): one cheap query checks `meta.store_version`; the instance's cached copy is reused while it matches, otherwise the tables are reloaded and re-validated. A change made by any other instance is therefore seen on the next request.
- **Writes** (`mutate`): one transaction, serialised across **all instances** by `pg_advisory_xact_lock`. It loads the current state, runs the change on a private copy, writes only the rows that changed, bumps `store_version` and appends to `audit_log`. This keeps stock checks, payment-webhook de-duplication and order creation race-free (the concurrency tests with six simultaneous buyers pass against it).
- **Try-on jobs** do not rely on background work (serverless functions end after the response): the job is handed to the provider during the creating request and each status request advances it by polling the provider once.

## Seeding
On the first request against an **empty** database the labelled demo data (`data/seed/demo.json`, compiled into the build) is loaded in one transaction under an advisory lock. Existing data is never overwritten, and a database that already has products or brands is marked seeded without changes. To start with your own catalog, create the products through the admin or import them before the site goes public, and delete the demo records.

## Migrations
- Automatic: the first request on each instance applies any missing migrations (ledger + advisory lock, safe when instances start together).
- Manual / CI: `DATABASE_URL=postgres://… npm run db:migrate`.
- Add a migration by appending `{ id, sql }` to `MIGRATIONS`; never edit an applied one.

## Testing the real driver locally
```bash
node scripts/pg-test-server.mjs 5433 &          # a PostgreSQL wire-protocol server (PGlite)
DATABASE_URL="postgres://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable" DB_POOL_MAX=1 npx next start -p 8770
BASE=http://localhost:8770 node scripts/e2e-commerce.mjs    # and the other suites
```
This exercises the production `pg` code path (pool, transactions, advisory locks, JSONB, bytea) with a single connection. It is **not** a substitute for a smoke test against the real Netlify database.

## Limits
- Writes load the whole store inside the lock (fine for hundreds of products and thousands of orders; a very large order table would need per-table queries).
- Uploads and photos as `bytea` suit modest media volumes; move to object storage for more.
- Rate limits and login throttles are still in memory per instance.
- `.env.local` for tests sets `TRYON_PHOTO_RETENTION_SECONDS`, `TRYON_SWEEP_MS`, `ALLOW_TEST_OUTBOX`, `RATE_LIMIT_SCALE`, test providers: none of these belong on Netlify.
