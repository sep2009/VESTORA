import "server-only";
import { effectivePrice, resolveStock } from "@/modules/catalog/types";
import { kindForCategory } from "@/modules/catalog/kinds";
import { bagStyleFor, occasionsFor, slotForKind, styleFor, tabFor, type StudioItem } from "@/modules/outfit/core";
import { getCatalog } from "./catalog";

/** Products the Outfit Studio can put on an avatar. Read from the one product database; only categories with a studio garment shape are included. */
export function getStudioItems(): StudioItem[] {
  const c = getCatalog();
  const brands = new Map(c.brands.map((b) => [b.slug, b.name]));
  const cats = new Map(c.categories.map((x) => [x.slug, x.name]));
  const out: StudioItem[] = [];
  for (const p of c.products) {
    const kind = kindForCategory(c.categories, p.category);
    const slot = slotForKind(kind);
    if (!slot) continue;
    const r = resolveStock(p);
    const style = styleFor(p.department, kind);
    out.push({
      id: p.id, slug: p.slug, name: p.name, brandName: brands.get(p.brand) ?? p.brand, category: p.category, categoryName: cats.get(p.category) ?? p.category, kind,
      audience: p.audience, department: p.department, featured: p.featured, image: p.images[0]?.url ?? null, demo: p.source.kind === "demo", sourceKind: p.source.kind,
      retailer: p.source.retailer, sourceUrl: p.source.url, price: effectivePrice(p), compareAt: p.salePrice ? p.price : null,
      variants: p.variants.map((v) => ({ sku: v.sku, size: v.size, color: v.color, stock: v.stock })),
      colors: r.colorsVerified ? r.colors : [], sizes: r.sizesVerified ? r.sizes : [],
      slot, tab: tabFor(kind, p.category), style, occasions: occasionsFor(style, kind), available: r.availability !== "out_of_stock", bagStyle: bagStyleFor(p.name, p.slug),
    });
  }
  return out;
}
