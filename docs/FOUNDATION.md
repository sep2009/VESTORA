# Vestora — Foundation (Stage 1)

## 1. Project audit (before this stage)

| Area | Finding |
|---|---|
| Framework | None. Static `index.html`, `style.css`, `app.js` (an investing growth calculator). |
| Dependencies | None. No `package.json`. |
| Routing / state | None (single page). |
| Styling | Hand-written CSS. |
| Database / auth / APIs | None configured. No `.env`. |
| Assets | None (no images, models, fonts). |
| Errors / limits | None found; page is unrelated to fashion e-commerce. |

Decision: the legacy page works, so it was **moved, not deleted**, to `legacy/`. Next.js was added in the same repo (no starter template was cloned).

## 2. Architecture

Layers, dependencies point downward only:

1. `src/app` — routes (server components by default, thin).
2. `src/components` — presentation. Only 3D/interactive pieces are client components.
3. `src/stores` — Zustand client state (cart, showroom focus). Identity + quantity only.
4. `src/server` — server-only code: env validation, Supabase access, catalog repository. Imports `server-only`, so it cannot be bundled into the browser.
5. `src/domain` — Zod schemas and inferred TS types. Single source of truth, no framework imports.

**One product identity.** Everything references `ProductId` / `VariantId` (branded UUIDs). The showroom store, cart lines, outfit items, recommendations and order lines hold ids, never copies of product data. Names and prices are read from the catalog at render time.

**Backend states.** The repository returns `ok | unconfigured | error`, so the UI never shows invented products when Supabase is missing.

## 3. Folder structure

```
src/
  app/            routes, layout, loading/error/not-found, api/health
  components/     showroom/ (R3F scene), ui/
  domain/         ids, catalog, user, avatar, outfit, cart, recommendation
  server/         env.ts, supabase/, catalog/repository.ts
  stores/         cart-store.ts, showroom-store.ts
  lib/            money.ts
supabase/migrations/0001_init.sql   full schema + row-level security
docs/FOUNDATION.md
legacy/           previous static landing page
```

## 4. Data model

Defined in `src/domain` and mirrored in `supabase/migrations/0001_init.sql`: departments, categories, collections, products, product variants, sizes, colors, inventory, users (profiles), user preferences, avatars, outfits, carts, orders, recommendations. Money is integer cents + ISO currency.

## 5. Dependency plan

Installed now: next, react, react-dom, three, @react-three/fiber, @react-three/drei, gsap, zustand, @supabase/supabase-js, @supabase/ssr, zod, server-only; dev: typescript 5, tailwindcss 4, @types/*.
Not installed yet (added with the stage that uses them): AI SDK (stage 8), Stripe (checkout), a 3D avatar/animation helper if needed, test runner.
GSAP is installed but unused until the scroll/camera stage.

## 6. Integration requirements (you must supply)

- Supabase project: URL, anon key, service-role key (`.env.local`), then run the migration.
- Product data: departments, categories, products, variants, stock.
- 3D assets: GLB models per product and showroom environment models/textures.
- AI provider key (server-side only) for the assistant and recommendations.
- Payment provider (e.g. Stripe) keys for checkout.

## 7. Roadmap

1. Foundation (this stage).
2. Auth (Supabase) and profiles; seed/admin catalog entry.
3. Showroom: departments as themed rooms, camera paths (GSAP), product hotspots.
4. Product detail and GLB viewer; cart sync; checkout and orders.
5. Avatar customization and virtual fitting room.
6. Outfit creator and style quiz.
7. Recommendation engine.
8. AI shopping assistant (server routes).
9. Admin dashboard, tests, performance and accessibility pass.
