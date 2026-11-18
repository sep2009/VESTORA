# Seed data

`demo.json` is **labelled demo data** (fictional brands, invented stock). On first run the database (`data/db/store.json`, gitignored)
seeds itself from it. Stock numbers here are NOT live inventory. Regenerate with `node scripts/generate-demo-seed.mjs`.

To start from an empty store, delete `data/seed/demo.json` and `data/db/store.json`, or set `VESTORA_SEED_FILE` to another file.
Real products are created in the admin dashboard (`/admin`) or imported by a server-side importer that uses the repository in `src/server/store/repo.ts`.
