# Outfit Studio: 3D avatar and outfit creator (`/style-creator`)

Combine real catalog products into an outfit on a 3D avatar, change color and size, save outfits, share them and add what is available to the cart.

## IMPORTANT: this is a preview mode, not a fitting simulation
There are **no licensed avatar or garment assets** in this project, and a real try-on needs garment meshes authored (or auto-fitted) for a skeleton with skin weights. So:
- The avatar is a **procedural mannequin**: a table of joints and body measurements (`avatar3d/body.ts`), drawn as smooth lofted shapes. It is not a scanned or modelled person, it is not skinned, and its presets are generic silhouettes, not a model of anyone's body. No photo or body data is asked for.
- Garments are **generic shapes generated from the same measurements** (a tee, shirt, hoodie, jacket, coat, suit, trousers, dress, sneakers, bag, watch, glasses), with a layer "ease" so layers do not intersect, tinted with the chosen variant's color. They do **not** show the real product's cut, pattern, texture or how it fits you. No cloth simulation.
- The UI says so (a "Preview mode" badge on the stage and a note under it).
- Product 3D models (`model3d`) are not used here: they are not authored for this skeleton, and attaching unrelated models to an avatar would be wrong.

### Integrating a professional solution later
`avatar3d/adapter.ts` is the seam: the studio passes only `{ avatar, worn }` to the figure, where `worn` is a list of `{ slot, item (a catalog product), colorHex }`. A real avatar/fitting service implements the same props (GLB avatar with skeleton, garments with matching skin weights or a fitting API) and reports `FIT_QUALITY` "authored" or "simulated". State, matching, cart, saving and sharing do not change. `Stage.tsx` (camera, lights) is independent of the figure.

## Data: every garment is a catalog product
- `getStudioItems()` (`server/catalog/studio.ts`) reads the one product database. Only categories whose kind has a studio shape appear (tee, shirt, hoodie, jacket, coat, suit, trousers, dress, sneaker, bag, watch, glasses).
- An outfit stores **product ids and the shopper's variant choice** (sku, size, color), never copies of product data. Names, prices, stock and images are read live. Missing products are removed on load with a message.
- **Unavailable products are never offered for purchase**: sold-out items are listed greyed ("Sold out") and cannot be put on the avatar from the list; they are never suggested; an outfit restored with a now-sold-out item shows "Sold out: not available to buy" and the item is skipped (with the reason) when adding to the cart. Out-of-stock sizes and colors are disabled; a size must be chosen before an item can go in the cart.
- Cart lines use the normal cart (`useCart`), so the server re-validates price, variant and stock at cart and checkout like any other line.

## Studio behavior
- **Avatar**: 4 presets (2 masculine-presentation, 2 feminine-presentation, different heights and frames), 6 skin tones, 6 hairstyles, 6 hair colors. Glasses and watches are catalog accessories. Clothing is not tied to the avatar's presentation: any product can be put on any preset.
- **Views**: Front, Back, Left side, Right side (animated; shortest path), drag to rotate, wheel/pinch zoom, Zoom +/−, Reset camera, auto-rotate. Reduced-motion users get no animation. If WebGL is missing the studio still works as a list and says why.
- **Categories**: Tops, Shirts, T-shirts, Pants, Jeans, Jackets, Hoodies, Dresses, Shoes, Bags, Accessories, with search, a fit filter and "in stock only".
- **Slots**: top (tee/shirt), hoodie, jacket/coat, bottoms, dress, shoes, bag, watch, glasses. Adding an item replaces only the same slot or items that overlap. A dress replaces top and bottoms; a suit replaces jacket and bottoms; hoodie layers over a tee; everything else stays.
- **Live preview**: changing color updates the garment immediately; sizes are shown with remaining stock; each worn item can be replaced or removed.
- **Outfits**: save, update, save as copy, rename, duplicate, delete (with confirmation), favorite, share link, open. Stored in this browser (`localStorage`, up to 50, validated on load). Share links carry only the avatar choice, product ids and variant choices (URL-safe base64); invalid or tampered links are rejected and unknown products are dropped.
- **Smart matching** (`modules/outfit/core.ts`): color compatibility (neutrals pair with everything, earth tones with neutrals and blues, otherwise by hue distance), style compatibility (sport, street, casual, dressy), occasion (everyday, work, evening, weekend, sport, derived from department and kind), and availability (sold-out items are never suggested). Each worn item shows a match percentage with reasons. "Show alternatives" lists other available products in the same slot, ranked, with "Show different matches" to cycle. "Complete my look" fills empty top, bottoms (unless a dress or suit covers them) and shoes with the best available matches. The rules are simple heuristics, not a stylist.

## Tests run
- `node scripts/test-outfit-core.mjs [baseUrl]` (needs the app running): 42 checks on the live catalog: combining 7 garments, replacing, dress/suit/hoodie rules, removal, no mutation, availability gates, size/variant purchase rules, color and style scoring, ranked and deterministic suggestions, alternatives, occasion ranking, audience filter, complete-look, share encode/decode round trip, rejection of malformed or oversized links, sanitizing stale products and variants.
- Browser (production build for the page, dev server for rendering iteration): avatar and appearance selection; front/back/side views and zoom; selecting tees, pants, shoes, jackets, hoodies, bags and accessories and seeing them layered; dress replacing top/bottoms; variant (color/size) changes; alternatives and replacement; removal; complete my look; save, rename, duplicate, favorite, delete with confirm, reload and restore (variants intact); share link opened in a clean browser (avatar, items, sizes restored, link cleaned from the address bar); invalid link rejected; adding the outfit to the cart (3 lines with real SKUs, accepted by `/api/cart/validate`); phone width 390 px with no horizontal overflow.

## Not done / limits
- No real avatar or garment assets, no skinning, no cloth simulation, no fit prediction by size. Garment shapes are generic; real product photos, textures and cut are not shown on the avatar.
- Product 3D models are not used. Colors come from the variant's color name or hex; patterns and prints are not shown.
- Outfits are stored in the browser only: not synced to accounts, not available on another device (use a share link). Share links are not short-links and are not stored server-side.
- Matching is rule-based and tuned to the demo catalog's colors; it does not understand fabrics, fit or seasons. Occasions are inferred from the department, not tagged by admins.
- Not tested: real touch gestures on a physical phone, screen reader behavior of the 3D stage (the stage is `role="img"`; all choices are available as ordinary controls), very low-end GPUs.
- Sold-out behavior of a worn item was verified in the logic tests and in the list UI; the restored-sold-out row was not exercised in the browser because the demo data had no worn item go out of stock during the test.
