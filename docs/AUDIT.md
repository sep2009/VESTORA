# Final audit report

Scope: every module built so far, audited end to end. **Verdict: feature-complete and consistent on demo data and test providers; NOT production-ready** until the external integrations in `docs/DEPLOYMENT.md` are configured.

## How to run the checks
Start the production build with `.env.local` (see `.env.example`, include the dev-only test providers and `RATE_LIMIT_SCALE=50`), then `npm test`. It runs: type check, ESLint, WCAG contrast of the design tokens, outfit logic (42), style quiz and recommendations (82), stylist (86), try-on backend (74), Stripe signature helpers (14), commerce end to end (95: cart, accounts, checkout, payment webhooks, inventory, concurrency, admin orders and permissions), security audit (79), and a crawl of every reachable route and link (260 URLs, 0 broken). **All passed on the final build.**
Not automated: browser journeys (no Playwright installed). They were driven manually in the in-app browser; results below.

## 1. Fully implemented and tested
3D mall (9 department rooms, guided / explore / focus camera, minimap, product displays, deep links, product sheet); shop, search and filters; product pages with variants, favorites and the 360° viewer (shown only when a real model exists); cart (server-priced and validated), multi-step checkout, accounts, orders, safe inventory, payment webhooks (test provider); admin dashboard (products, taxonomy, showroom layout, orders, uploads, roles); Outfit Studio (4 avatars, 11 categories, saving, sharing, cart); style quiz and rule-based recommendations with explanations and consent-controlled learning; rule-based stylist with outfit building, budgets, department location in the mall and model-output validation; virtual try-on avatar mode and 3D garment mode.

## 2. Partially implemented
- **Photo try-on:** complete pipeline (consent, private storage, jobs, limits, deletion) but only a labelled test provider exists; no real AI service.
- **Stylist AI:** the model layer and validation exist; no real model is connected (rules answer everything).
- **Stripe:** implemented from the documented API, never run against Stripe.
- **Supabase:** schema drafts only; the app uses a JSON file store (single instance).
- **Avatar / garments:** generic preview shapes, not fitted garments.
- **3D product models:** viewer is complete; only a test fixture model exists.
- **Admin:** works; not checked on phone or tablet layouts.

## 3. External integrations still required
Database (Supabase or other) + adapter; Stripe account and webhook; email service; real product feed or catalog with licensed images; hosting with HTTPS; optional AI try-on and language-model providers (adapters must be written from their official documentation); monitoring and backups.

## 4. Missing assets
Real product photography and GLB models; licensed avatar and garment-fitting assets; production favicon/brand images were not reviewed; HDR environment maps (the mall uses procedural lighting).

## 5. Remaining known bugs and limits
- Rate limits and login throttles are in memory (reset on restart, not shared across instances).
- The 3D mall draws ~970 objects per frame; smoothness on integrated GPUs is unconfirmed (frame rate cannot be measured in the preview pane). Quality auto-drops to Lite.
- `/design-system` is a public development page.
- The demo "suit" illustration reuses the jacket drawing.
- Cart lines are priced from the catalog at checkout; there is no tax, coupons, refunds, returns or carrier integration.
- 23 lint warnings remain (unused variables, `<img>` instead of `next/image` for external/demo URLs); 0 errors.
- Not tested: screen readers, real touch devices, tablet and laptop sizes beyond spot checks (1366×768 and 1280 desktop, 390 phone were inspected), Safari/Firefox.

## 6. Performance findings
- Fixed in this audit: no loading feedback while the mall builds (now a loader), crash or missing WebGL left a dead page (now an error boundary and a 2D department fallback), rendering continued when the mall was off-screen (now paused), periodic shadow re-renders (earlier fix), decoder files uncached (now immutable).
- First-load JS: most routes 100–150 kB shared; Outfit Studio and Try-On pages ~230 kB (three.js is code-split and loads only when a canvas is needed).
- API cost is low: the catalog is a single in-memory read per request; recommendation and stylist rules are linear over 72 products. The JSON store rewrites a whole file per write; fine for one small instance, a bottleneck under load.
- Dynamic pages are `no-store`. Consider caching the catalog and product pages once a real database exists.
- Not done: texture compression (KTX2), geometry instancing for repeated products, image optimization for external product images, automatic GLB compression.

## 7. Security findings
- **Fixed now:** no security headers were sent. Added nosniff, frame denial, referrer and permissions policies, COOP, a Content-Security-Policy and HSTS (production), and hid the framework banner. CSP verified against the mall, viewer and chat in a browser (no violations seen).
- **Verified (79 checks):** every admin and customer API refuses anonymous callers on every method; forged and cross-role cookies refused; admin pages redirect before rendering; CSRF header and same-origin required on state changes; malformed, oversized and hostile input handled without stack traces; uploads checked by content and path traversal refused; private data files and `.env*` not served; payment webhooks reject unsigned calls; no environment secret in the client bundle or rendered pages; no source maps.
- **Open:** CSP still allows inline scripts (`'unsafe-inline'`) because Next.js bootstrap scripts need nonces to remove it. `npm audit` reports a moderate/high PostCSS advisory inside Next 15 (build-time CSS processing of attacker-controlled CSS; this app processes none at runtime); the fix requires a Next 16 major upgrade. Supabase row-level-security policies are untested. Files are not encrypted at rest beyond permissions. No malware scan on uploads. Passwords use scrypt; no 2FA or CAPTCHA. Cookies require HTTPS in production.

## 8. Accessibility findings
Static crawl of all pages: every page has a language, title and exactly one h1 (admin excluded); no image without alt, no unnamed button or link, no unlabeled input. Design tokens meet WCAG AA contrast (checked: ink, muted, accent text, ok, warn, danger on both backgrounds). Reduced motion is honored in the mall, avatars and stylist. The 3D mall has an alternative route: the shop, search, the department list and the new 2D fallback. Keyboard: arrow keys, Esc, Home in the mall; focus trap and Esc in the product sheet; all chat and studio controls are buttons. Not verified with a screen reader.

## Journeys (manual, in the in-app browser, final build unless noted)
1. **Mall to purchase:** mall loads; minimap and camera fly to a department; product opens by deep link; details page; viewer tab; size and color chosen (out-of-stock combinations disabled); favorite toggles; add to cart creates the correct SKU line; checkout and payment through the test provider are covered by the 95-check commerce suite and were driven in the browser in the commerce stage.
2. **Quiz to cart:** quiz with skipped questions, saved profile, For-you picks with explanations, Outfit Studio avatar and multi-item outfit, saving, stylist outfit for a birthday party, avatar preview, sizes chosen and items added to the cart (verified in earlier stages and by the stylist and style suites).
3. **Try-on:** avatar mode with a real product, garment change, compare, back to product page, add to cart; 3D mode with the model product; photo mode shows "unavailable" with no provider.

## Changes made in this audit
Security headers and CSP; 3D loading overlay; WebGL 2D fallback and scene error boundary; global error boundary; pause rendering off-screen; ESLint added (`npm run lint`); test runner (`npm test`); route/link/accessibility crawler; security audit; contrast audit; test-only rate-limit scaling; deployment documentation. A route-level `loading.tsx` was tried and removed because streaming made missing products return HTTP 200 instead of 404.
