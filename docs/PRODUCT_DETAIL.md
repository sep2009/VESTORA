# Product detail experience and 3D viewer

One component, `ProductDetailView`, renders a product in two places: the `/product/[slug]` page and a sheet that opens over the 3D mall. Both read `getProductDetail(slug)` (`src/server/catalog/detail.ts`), which also serves `GET /api/products/[slug]`.

## Opening a product from the showroom
Click a display → the camera flies to it (existing focus mode) → **View details** in the info card opens `ProductSheet`. The mall stays mounted underneath, so closing the sheet (Esc, the close button, or the browser/phone Back button) returns to the same room, camera and focused product. The sheet expands from the place where the focused object is on screen; reduced-motion visitors get no animation. Recommended products open inside the same sheet. "Open in shop" still goes to the full page.

## 3D viewer (`src/components/product/viewer/`)
- Loads the product's real GLB/glTF (`product.model3d`) with `GLTFLoader` (Draco and meshopt supported; decoder files in `public/draco`).
- Lazy: no model bytes and no WebGL until the viewer is on screen; rendering pauses when scrolled away or the tab is hidden. Progress bar while downloading.
- Controls: drag to rotate 360°, wheel zoom with Ctrl/Cmd (plain wheel scrolls the page), pinch, right-drag or two-finger pan, Front/Back/Left/Right/Top, zoom buttons, Reset, Spin, Full screen (CSS fallback on iPhone), keyboard (arrows, + and −, 0).
- Lighting presets: Studio, Daylight, Warm, Dramatic (procedural environment, no HDR download).
- Texture inspection: Shaded, Texture only (unlit base-color map), Normals, Wireframe; a Details panel lists triangles, materials, texture names and sizes, file size and licence.
- Never fakes 3D. No model → tabs disappear and photographs are shown with the note "There is no 3D model for this product yet". A missing, invalid, over-heavy (>1.5M triangles) file or no WebGL → the same note with the reason.
- Memory: geometry, materials and textures are disposed when the viewer unmounts; inspection materials are disposed when switched.

## Variants and purchase
Sizes and colors come from the product's variants. A combination with no stock is disabled; choosing a color clears a size it does not have. The chosen SKU, stock note, quantity (capped by stock, max 10) and validation messages feed add-to-cart (the cart line stores SKU, size, color, quantity). Favorites and Share (system share sheet, else copy link) are included. Photos can be tagged with a color in the admin; picking that color jumps to the photo. **The 3D model is not recoloured**: it shows the colors authored in the file.
Shipping text appears only when an admin fills **Shipping information** on the product.

## Recommendations (`src/modules/catalog/recommend.ts`)
Similar products (same category or kind), Pairs well with (kinds that go together, same department, brand or collection), Complete the look (bags, watches, glasses), and More in the department. All are catalog records; no product appears in two groups or recommends itself; sold-out items rank lower; ties are deterministic.

## Tests run (production build, demo data)
- Opened details from the showroom deep link, loaded a real GLB (a generated test fixture, `scripts/make-test-model.mjs`, rendered with its texture), rotated by drag, used view buttons, zoom, Texture-only inspect, Details panel.
- Variant change disabled the unavailable size; add to cart with quantity 4 merged into the existing line; validation message without a size; favorites toggled.
- Sheet: recommended product swapped inside the sheet; Back and Esc closed it and the showroom kept the same focused product.
- Missing model file → photo fallback with reason. Mobile 375 px: no horizontal overflow, controls under the viewer.
- Recommendations checked for all 72 products (no self, no duplicates, all real ids).

## Not verified / not done
- No real product GLB exists. Only the fixture was used, attached in the local dev database (not in the repo seed), so every seeded product shows photos.
- Real touch gestures, native fullscreen and the Draco/meshopt decoders were not exercised (the fixture is uncompressed).
- Texture optimisation is by upload limits (25 MB) and the triangle cap, not automatic resizing: compress models (gltf-transform or similar) before upload.
- Model recolouring per variant would need one model file per color.
- The sheet's origin is the centre of the focused view, not a projected screen position of the object.
