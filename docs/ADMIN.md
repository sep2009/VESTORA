# Product database, catalog and admin dashboard

One data source feeds the 3D mall, the shop, search, cart and favorites. A product's `id` never changes and is the key everywhere.

## Architecture
- **Schema**: `src/modules/catalog/types.ts` (zod). Product, variants (sku, size, color, stock), brand, category, collection, department, images, optional 3D model reference, price, sale price, tags, materials, featured, source. Sizes, colors and availability are *derived* from variants. Non-demo records must carry a source URL, price, image and licences.
- **Store**: `src/server/store/` — a file-backed database (`data/db/store.json`, gitignored) with atomic writes, a write lock, validation on every write and an audit log. Seeded on first run from `data/seed/demo.json` (72 products, clearly labelled demo, not live inventory). Override paths with `VESTORA_DATA_DIR` / `VESTORA_SEED_FILE`.
- **Read model**: `src/server/catalog/` builds the catalog and mall displays from the store.
- **Showroom placement**: fixtures are data (`SlotRecord`: type, position, rotation, scale, visibility). `validateSlots` rejects fixtures outside the room, blocking doorways or overlapping. Products are pinned to fixtures (`assignments`) or auto-placed; the mall picks the change up without any 3D code edit.
- **Supabase**: `supabase/migrations/0002_catalog_admin.sql` (tables, constraints, RLS, storage buckets and policies). **Written but never run** — no Supabase project is connected. The app does not use it yet; a repository adapter is the remaining step.

## Admin
Routes: `/admin` (dashboard), `/admin/products`, `/admin/products/new`, `/admin/products/[id]`, `/admin/taxonomy` (brands, categories, collections, departments), `/admin/showroom?dept=…` (floor plan, fixtures, pins).

Security:
- Passwords are scrypt hashes in env (`ADMIN_PASSWORD_HASH`, optional `EDITOR_PASSWORD_HASH`); `SESSION_SECRET` signs an HttpOnly, SameSite=Strict cookie. Nothing privileged reaches the browser.
- Roles: **admin** (everything) and **editor** (products, stock, uploads; no deletes of taxonomy, no showroom layout).
- Edge middleware redirects unauthenticated `/admin/*`; every API route re-checks the role; mutations need a custom header and a same-origin check; login is rate limited.
- Uploads: file type is checked from the bytes (PNG/JPEG/WebP/GIF/AVIF; GLB and embedded glTF 2.0; SVG refused), size limits 5 MB / 25 MB, random file names, served through an allow-listed path.

## Setup
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # SESSION_SECRET
node scripts/hash-password.mjs "a long password"                                   # ADMIN_PASSWORD_HASH
```
Put both in `.env.local`, restart, open `/admin`. Without them the admin stays locked.

## Test results (production build, demo data)
- Node logic checks: 75/75 (seed, validation, CRUD, referential integrity, 25 concurrent creates, uploads and path traversal, passwords, sessions, rate limit, showroom validation).
- HTTP end to end: 76/76 (auth, cookie flags, CSRF/origin, tampered cookie, create/edit/delete reflected in shop, search and mall under the same id, image and model upload, inventory, department move, slot and pin changes reaching the mall, rename reaching filters, editor restrictions, deleted product → 404, brute force → 429).
- Browser: login, product list, create product through the form, delete, taxonomy and showroom pages render.
- Not browser-tested: dragging in the floor plan, uploading through the file picker, mobile layout of the admin.

## Not done / needs you
- Supabase adapter and migration are untested; needs a project, keys and a real auth flow (the current admin uses env passwords).
- No real products. A feed importer needs your affiliate or retailer account and rights.
- Orders and payments are not built. Outfit Studio and AI Stylist remain placeholders.
- The file store suits one server instance; serverless hosting needs the Supabase adapter first.
