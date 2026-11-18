import "server-only";
import { departmentLabel } from "@/modules/catalog/kinds";
import { formatMoney } from "@/lib/money";
import type { Facts, Names, StyleItem } from "@/modules/style/core";
import { getCatalog } from "./catalog";
import { getStudioItems } from "./studio";

/** Catalog products as the style engine sees them (one database read; the engine itself is plain in-memory rules). */
export function getStyleItems(): StyleItem[] {
  const c = getCatalog(), byId = new Map(c.products.map((p) => [p.id, p]));
  return getStudioItems().map((it) => { const p = byId.get(it.id)!; return { ...it, tags: p.tags, brand: p.brand, isNew: p.department === "new-arrivals" }; });
}
export function getFacts(items: readonly StyleItem[]): Facts {
  const c = getCatalog();
  const colors = new Map<string, string>();
  for (const p of c.products) for (const col of p.colors) if (col.hex && !colors.has(col.name)) colors.set(col.name, col.hex);
  const present = new Set(items.map((i) => i.department)), brandsPresent = new Set(items.map((i) => i.brand));
  const cur = new Map<string, number>(); items.forEach((i) => i.price && cur.set(i.price.currency, (cur.get(i.price.currency) ?? 0) + 1));
  const currency = [...cur].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "USD";
  const prices = items.filter((i) => i.price?.currency === currency).map((i) => i.price!.amount);
  return {
    departments: c.departments.filter((d) => present.has(d.slug) && d.slug !== "new-arrivals").map((d) => ({ slug: d.slug, name: departmentLabel(d.slug) })),
    kinds: [...new Set(items.map((i) => i.kind))], colors: [...colors].map(([name, hex]) => ({ name, hex })),
    brands: c.brands.filter((b) => brandsPresent.has(b.slug)).map((b) => ({ slug: b.slug, name: b.name })).sort((a, b) => a.name.localeCompare(b.name)),
    currency, priceMin: prices.length ? Math.min(...prices) : 0, priceMax: prices.length ? Math.max(...prices) : 0,
  };
}
export function getNames(facts: Facts): Names {
  const c = getCatalog(), brands = new Map(c.brands.map((b) => [b.slug, b.name])), hex = new Map(facts.colors.map((x) => [x.name, x.hex]));
  return { department: departmentLabel, brand: (s) => brands.get(s) ?? s, money: formatMoney, hex: (n) => hex.get(n) ?? null };
}
