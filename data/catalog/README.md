# Catalog data

Every `*.json` file here is merged into the one catalog that feeds BOTH the 3D mall and the shop.

- `demo.json` — **test data only** (fictional brands, no real products or photos). Delete it when real data exists.
- Add real records as another file, e.g. `verified.json`, in the same shape (see `src/modules/catalog/types.ts`).
  Non-demo records must have a source URL, a verified price, at least one image and an image licence;
  records that fail validation are rejected and logged, never silently fixed.
- Provider feeds (Awin, Rakuten, Impact, CJ…) should be converted into this shape by an importer that runs on the server
  with credentials from `.env.local`. No such importer is connected yet.
