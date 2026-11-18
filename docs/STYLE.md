# Style quiz, style profile and recommendations (`/style-quiz`, `/for-you`)

Personalized discovery from **ordinary rules over the product database**. No AI provider is called, none is needed, and everything works without one.

## The quiz (`src/modules/style/core.ts`, `components/style/StyleQuiz.tsx`)
Eleven simple steps, one per screen, with a progress bar and numbered jump buttons: departments (fashion categories), kinds of pieces (product types), styles (minimalist, classic, streetwear, sporty, casual, elegant), outfit combinations, casual-to-formal slider, occasions, colors to like and to avoid, seasons, budget per item, brands, and which store sections to show.
- **Required:** departments and styles (the minimum to learn anything). **Everything else is optional** and has a "Skip this question" button; skipped steps are recorded as skipped and add no preference.
- Options come from the real catalog (departments, product types, color names with their swatches, brands, price range), so every choice leads to products.
- You can go back, jump to any question, finish early once the required answers exist, review the whole profile and edit any answer from the review screen or later from `/style-quiz`.

## The style profile
Saved answers plus a derived profile: department and product-type weights (a combination you like implies its pieces, a little weaker than a direct choice), style weights, liked and avoided colors, formality (0–1), occasions, seasons, budget range with currency, brands, summary **style tags** (for example "minimalist", "leans formal", "neutral palette", "weekend") and interest tags. Derived data is **always recomputed from the answers**, including on the server, so tampered stored data has no effect.
- Stored on the device (`vestora-style-v1`). Signed in, it is also saved to the account (`data/db/style-profiles.json`; newest copy wins) so it follows you. Delete it from the quiz page or the For you page: it is removed from the device and the account.

## Recommendation engine
`rank()` scores every product that passes the **hard rules**, then sorts. Deterministic, linear in the number of products, run on the server from one catalog read (72 products: well under a millisecond per product), no network calls.
- **Hard rules (never relaxed):** in stock; within the budget (products with no price, or in another currency, are not shown against a budget); not available only in a color you avoid; inside the section you explicitly chose (men's/women's/all: your choice only, never inferred); and, if you allow it, not something you already bought.
- **Scored parts:** department 20%, product type 16%, style 20%, color 14%, price fit 6%, season 8%, formality 10%, occasion 4%, tags 2%; a preferred brand adds a small bonus; consented signals add at most 12%.
- **Style:** rule-based. A product's style fit comes from its department and type, plus "minimalist" when all its in-stock colors are neutral. Brands do not tag styles.
- **Season:** the catalog has no season field, so this is a general rule about the **type** of garment (a coat suits autumn and winter) and is worded that way.
- **Color:** exact name match, or a similar hue/lightness from the swatch; the color shown is a real in-stock color of the product.

## Explanations
Written from the product record and the shopper's own answers, never invented. At most the three strongest reasons, for example: "This jacket is in our Casual department, one of the areas you chose, fits your minimalist style (neutral colors: Black, Stone) and comes in Navy, a color you chose." Possible reasons: department, product type, style (with its concrete basis), color, price versus budget, season (by type), formality, occasion, brand, and similarity to items you allowed us to learn from. Without a profile the text only says "featured by the shop" or names the department.

## Discovery (`/for-you`)
Top picks, suggested departments (where most matches are), personalized collections (in your colors, one per chosen style, one per chosen occasion and season, best matches in your budget, because of what you saved), recommended outfits (anchored on a top-scoring top, dress or jacket and completed with the Outfit Studio matching rules, all pieces available and passing the same filters, with an "Open in Outfit Studio" link), recommended accessories (bags, watches, eyewear), and new arrivals (the New arrivals department) that match. Collections and picks re-compute immediately when answers or personalization change. Collections with fewer than three matches are not shown. With no profile the page shows shop-featured picks and offers the quiz. If filters leave nothing, it says so and what to widen.

## Learning from activity: your control
Four signals, **all off until switched on**, each independent: favorite products, items in saved outfits, products viewed (counted on this device only while on), previous purchases (read by the server from the signed-in account; a client cannot supply them; bought items are not recommended again). Signals only nudge ranking by product type, department, brand and color, and the page says which ones are in use. Turning "views" off erases the counts; "Clear what I viewed" and "Delete my style profile" are on the page. Selected categories come from the quiz answers.
**Never inferred:** gender, age, body, health, income, religion, location or any other sensitive trait. Budget is only what you enter (purchases never change it). Audience filtering is only your explicit choice.

## API
- `POST /api/style/recommend` (optional sign-in, CSRF, 120 requests/min per IP): `{ profile?: { answers }, signals?, limit? }` → picks, departments, collections, outfits, accessories, new arrivals, `meta` (what was used). The response has no stock numbers or variant tables.
- `GET | PUT | DELETE /api/style/profile` (sign-in): saved answers and personalization choices.

## Tests
- `node scripts/test-style.mjs` (82 checks, live catalog, server running): quiz coverage and required/optional rules; skipped answers; profile generation, tags and implied combination pieces; sanitizing (unknown values dropped, malformed refused, derived data not trusted); editing answers; ranking accuracy for departments, product types, liked and avoided colors, budget (max, band, unknown price, other currency), availability (sold-out never shown), audience, seasons, formality, minimalist, brand; determinism; explanations contain only true facts (colors, price, brand, occasion, department) and no invented attributes; signals have no effect without consent, apply per consent, are bounded and never override filters; discovery sections (collections, departments, accessories, new arrivals, outfits) respect all filters; profile edits change collections; skipped optional questions still give recommendations; no profile and impossible filters behave; API behavior (validation, CSRF, no leakage, account profile save, restore, edit, delete, isolation between accounts); a real paid order excluded from recommendations only with purchases consent and only from the server's own order data.
- Browser: full quiz with skipped optional questions, review and save; For you page with tags, collections, outfits and explanations; personalization toggles (no effect until consent, then reorder and name the signal); editing answers (multi-select, jump, budget) and the budget filter on prices actually paid; deleting the profile (device and account); no horizontal overflow on a 390 px phone for any quiz step or For you.

## Not done / limits
- Recommendations are rules, not learned models: they cannot discover taste the answers and allowed signals do not express, and do not understand fabric, fit or trends. Style and season mappings are tuned for this catalog's departments and product types and are editable in `core.ts`.
- Weights are not validated with real shopper behavior (no click or purchase data exists yet); treat them as a transparent starting point.
- "New" means the New arrivals department; products have no creation date.
- The profile and view counts are per device unless signed in; view counts are never synced. Nothing here sends data to third parties.
- The AI Stylist page remains a placeholder: it would add chat on top of this engine and needs a provider key, which is not required for any recommendation here.
