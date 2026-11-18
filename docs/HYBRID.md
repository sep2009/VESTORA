# Hybrid platform: 3D mall + shop on one catalog

## One catalog
`data/catalog/*.json` → `src/server/catalog/catalog.ts` (validated loader) is the **only** product source. The mall, shop, search, cart and favorites all use the catalog product `id`. The 3D mall has no product records of its own: its fixtures (`modules/showroom/displays.ts`) are layout only and `assign.ts` fills them from the catalog. A product that fits no fixture is not shown in the mall (it stays in the shop).

## Trust rules (enforced in `modules/catalog/types.ts`)
- Non-demo records must have a source URL, a verified price, at least one image and an image licence; otherwise they are rejected at load and logged. Nothing is silently fixed.
- Sizes and colours are only offered and filterable when marked verified. Facets show only filters the data supports.
- `source.kind = "demo"` records are labelled everywhere ("Demo"), cannot be bought, and their illustrations come from `/api/demo-image` which refuses non-demo records.
- Prices are never summed across currencies; availability "unknown" is shown as such.

## Modes
- **Explore** (`/`): the 3D mall. **Shop** (`/shop`, `/product/[slug]`, `/brands`, `/categories`).
- The header's mode switch returns to where you last were in each mode (shop filters/product; mall room/product) via `stores/nav-memory.ts`.
- Deep links: `/?p=<product slug>` opens that product in the mall; `/?dept=<department>` flies to a department; "Open in shop" and "Show in 3D mall" connect the two.
- Search (Ctrl/Cmd+K) finds brands and products, and jumps to the department or the exact display when one exists.

## Cart and checkout
One persistent cart (`stores/cart-store.ts`): product id, size, color, quantity, price, source. Checkout takes no payment: no provider is configured, and real products link to their seller. Demo items cannot be bought.

## Mobile
Shop-first home (search, departments, products); the 3D mall loads only on request (or via a deep link), in Lite quality.

## Not built / needs external setup
- **Real data**: an affiliate-feed (Awin, Rakuten, Impact, CJ) or retailer importer that writes verified records into the store (see docs/ADMIN.md). Needs your publisher account, brand approvals and credentials in `.env.local`. None is connected.
- **Product photography and 3D models** that you have the rights to (record `images[].license`, `assets/manifest.ts`).
- **Outfit Studio** (needs avatar assets) and **AI Stylist** (needs a server-side AI key): placeholders only.
- **Payments** (e.g. Stripe) and a products-we-sell model: not configured.
- Orders and accounts: not built. Admin: see docs/ADMIN.md.

## Acceptance results (demo catalog, production build)
| Flow | Result |
|---|---|
| A. Explore → department → click product → product information | Works. Click opens the exact catalog record (brand, name, price, demo/sold-out labels, link to its page). |
| B. Shop → search → filter → open product → add to cart | Works. Search "hoodie" → 6; + brand + size → 2; product page validates size, cart line keeps id, size, color, qty, price, source. |
| C. Product in Shop ↔ Explore | Works both ways via `/?p=slug` and "Open in shop" (same product id). |
| D. Cart across modes | Works. Cart unchanged after switching modes and reloading. |
| E. Mobile | Works at 375 px: shop-first home, department buttons, search → product → cart, no horizontal overflow. Real touch gestures on a device not tested. |
| F. Brand search → department → verified products | Works: "Indigo Works" → "In mall: Denim" flies there; "Browse" lists its products. (Only demo products exist, so none are "verified".) |
| Guided tour, 13 stops, forward and reverse | Works. |
| Catalog core (24 checks), mall placement (14 checks) | Pass (run in Node). |

Test-environment note: the embedded browser pane does not fire `requestAnimationFrame` or `requestIdleCallback` until it has focus, so pages hydrate only after an interaction there. Real browsers are unaffected.
