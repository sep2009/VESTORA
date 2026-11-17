# Visual realism overhaul

## What made it look cartoonish (audit)
1. Every surface was a single flat-colour material (~120 inline materials, no texture maps, no roughness variation).
2. Lighting: a hemisphere light plus a coloured point light per room, no environment reflections, emissive neon trims.
3. Garments were boxes and cylinders; accessories were scaled 2-3.4x life size.
4. Saturated accent colours (orange, lime, magenta) used as surfaces.
5. No ambient occlusion or contact shadows; no instancing; thousands of draw calls.

## What changed
- **Materials** (`scene/pbr/`): procedural, tileable PBR textures (albedo, normal, roughness) for marble, limestone, travertine, concrete, terrazzo, oak, walnut parquet, plaster, fabric weave, leather, brushed metal, wool. Roughness lives in the maps, so polished marble is smooth while plaster, concrete and wood are matte/satin. Generated once per pattern and shared by cheap clones.
- **Palette**: muted real-material tones (dark green lacquer + brass, raw concrete + black steel, honed limestone, oak, navy wool + parquet). Brand-colour accents only on signage.
- **Geometry**: tailored garment silhouettes (extruded with bevel and fabric bulge), wooden hangers, lathe-turned mannequins with tapered limbs, side-profile sneakers with a separate sole, leather bags, watches, glasses at true size.
- **Architecture**: plastered walls with skirting, cornice with a concealed LED slot, architraves and lintels, structural floor slabs, stone coping on cutaway walls, ceiling-level track lights, brass details, stone/steel entrance.
- **Furniture**: upholstered benches/sofas/armchairs (rounded forms), wool rugs, concrete-potted plants (instanced leaves), brass ring pendants, vitrines, oak/steel shelving.
- **Lighting**: procedural studio environment (soft box, window panels, floor bounce) for reflections and fill; one warm soft sun for shadows; warm spot per room (High only). No neon, no glow.
- **Post-processing (High only)**: N8AO ambient occlusion, Khronos neutral tone mapping, very light vignette. No bloom, no depth of field.
- **Camera**: gentler easing (sine in-out), longer moves, slower scroll smoothing; moves are timed by wall clock.

## Performance
Measured (production build, Lite renderer path): draw calls 3,525 → 1,075, triangles 1.29 M → 0.65 M, geometries 1,374 → 520, via static mesh merging (`StaticMerge`) and shadow maps refreshed 4×/s instead of every frame. Instancing for rack garments, sneaker wall, plant leaves. Texture generation reuse cut startup from >30 s to ~1.3 s in the same environment. Lite mode (auto for touch/weak devices and on sustained low frame rate; toggle in the UI) disables post-processing and spots, uses smaller shadow maps and textures. Caches are disposed when the scene unmounts.
Add `?stats=1` to the URL and read `window.__vestoraStats` for live renderer counters.

## Still placeholders (honest list)
- **All products are procedural stand-ins**, not real merchandise. Garments are tailored silhouettes without seams, prints or trims; mannequins are abstract; accessories are simplified. The info card says "Sample product" and "Placeholder model". Real assets plug in via `modules/showroom/assets/manifest.ts` (see that file).
- Textures are generated, not photographic scans; marble veining and wood grain are convincing at room distance, simple up close.
- Plants, furniture and fixtures are modelled, not scanned.
- No real-time reflections (environment map only), no baked global illumination.
