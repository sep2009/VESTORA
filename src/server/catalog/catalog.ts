import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { brand, catalogFile, product, type Brand, type Product } from "@/modules/catalog/types";

/**
 * The ONE catalog. Both the 3D mall and the shop read it through here.
 * Sources: JSON files in data/catalog (manually verified records, exported feeds, or the labelled demo set).
 * Every record is validated; invalid ones are rejected (never silently fixed) and reported.
 * Provider integrations (affiliate feeds, retailer APIs) write the same record shape into this folder or a database.
 */
export type Catalog = { brands: Brand[]; products: Product[]; rejected: { file: string; id: string; reasons: string[] }[] };

let cached: { at: number; value: Catalog } | null = null;

export function loadCatalog(dir = path.join(process.cwd(), "data", "catalog")): Catalog {
  const brands = new Map<string, Brand>(), products = new Map<string, Product>(), slugs = new Set<string>();
  const rejected: Catalog["rejected"] = [];
  let files: string[] = [];
  try { files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort(); } catch { /* no catalog folder yet */ }
  for (const file of files) {
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(path.join(dir, file), "utf8")); } catch { rejected.push({ file, id: "*", reasons: ["not valid JSON"] }); continue; }
    const parsed = catalogFile.safeParse(raw);
    if (!parsed.success) { rejected.push({ file, id: "*", reasons: parsed.error.issues.map((i) => i.message) }); continue; }
    for (const b of parsed.data.brands) { const r = brand.safeParse(b); if (r.success) brands.set(r.data.slug, r.data); }
    for (const rawProduct of parsed.data.products) {
      const id = String((rawProduct as { id?: unknown })?.id ?? "?");
      const r = product.safeParse(rawProduct);
      if (!r.success) { rejected.push({ file, id, reasons: r.error.issues.map((i) => `${i.path.join(".") || "record"}: ${i.message}`) }); continue; }
      if (products.has(r.data.id) || slugs.has(r.data.slug)) { rejected.push({ file, id, reasons: ["duplicate id or slug"] }); continue; }
      if (!brands.has(r.data.brand)) { rejected.push({ file, id, reasons: [`unknown brand "${r.data.brand}"`] }); continue; }
      products.set(r.data.id, r.data); slugs.add(r.data.slug);
    }
  }
  return { brands: [...brands.values()], products: [...products.values()], rejected };
}

/** Cached for a few seconds so a page render does not re-read the files for every component. */
export function getCatalog(): Catalog {
  const now = Date.now();
  if (cached && now - cached.at < 5000) return cached.value;
  const value = loadCatalog();
  if (value.rejected.length > 0) console.warn(`[catalog] rejected ${value.rejected.length} record(s):`, value.rejected.slice(0, 5));
  cached = { at: now, value };
  return value;
}

export const getProductBySlug = (slug: string) => getCatalog().products.find((p) => p.slug === slug);
export const getProductById = (id: string) => getCatalog().products.find((p) => p.id === id);
