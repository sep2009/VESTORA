# 3D fashion mall (Stage 3)

## Layout
A 3×3 grid of 16 m rooms joined by 4.5 m corridors (6 m long), 12 corridors in total.

| | | |
|---|---|---|
| Minimal | Formal | Casual |
| Luxury | **New Arrivals** (central showroom) | Streetwear |
| Accessories | Entrance (+ street portal) | Lounge |

North and west walls are full height; south and east walls are cut low (dollhouse cutaway) so the camera, which sits south-east, sees into every room. Orbit is limited to the south→east quarter for that reason.

## Code map
- `src/modules/showroom/` — **data only** (no THREE/React): `layout.ts` (zones, palettes, openings, corridors), `displays.ts` (placements), `sample-products.ts`, `resolve.ts` (placements + catalog → renderable displays), `types.ts`.
- `src/components/showroom/scene/` — rendering: `ShowroomEnvironment`, `DepartmentZone`, `MainEntrance`, `ExhibitionWall`, `ClothingRack`, `ProductDisplay`, `DepartmentSign`, `DirectionalSign`, `LightingSystem`, `CameraRig`, plus `Walls`, `Corridor`, `Decor`, `Procedural` (garments, mannequins, accessories), `ModelBoundary` (GLB loader), `materials` (procedural textures).
- `src/components/showroom/` — DOM around the canvas: `Showroom`, `Minimap`, `DisplayInfo`, `ShowroomLoader`.
- `src/stores/showroom-store.ts` — active department (camera target) and selected display id.

## Placement system
Every display is a `DisplayPlacement`: unique `id`, `departmentId`, `position`, `rotation`, `scale`, `type` (rack, mannequin, platform, shelf, pedestal, table, niche) and a `productRef` (`catalog` product id or `sample` id). 56 displays, 8 per department.

## Products
- With the catalog connected, real products take the first displays of their department (matched by department slug) in catalog order; leftover displays keep clearly labelled samples (“Sample · …”, with a “Sample product” tag in the info card). Samples have no price and cannot be bought.
- Real products link to `/product/[slug]`.
- Appearance of real products: first variant colour on a procedural garment/accessory of the display's kind, or their GLB/GLTF (`assets.modelUrl`) on a round stand.

## Models and fallback
`ModelOrFallback` loads GLB/GLTF without ever throwing. While loading, and on a missing or invalid file, the procedural item is shown, so a display is never empty or broken. Models are scaled to 1.5 m tall and sit on the stand's top.

## Known limits
- Item kind (tee, coat, sneaker…) for real products comes from the placement, not the product, until categories carry a kind.
- The sneaker wall in Streetwear is decorative, not clickable products.
- Wall/sign text is drawn to canvas textures; signs are not readable by screen readers (the map buttons are).
