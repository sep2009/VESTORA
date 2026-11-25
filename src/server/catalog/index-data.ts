import "server-only";
import { assignProducts, toMallProduct } from "@/modules/showroom/assign";
import { recordsToSlots } from "@/modules/showroom/slots";
import { effectivePrice, resolveStock } from "@/modules/catalog/types";
import { kindForCategory } from "@/modules/catalog/kinds";
import type { ItemKind } from "@/modules/showroom/types";
import { getCatalog, type Catalog } from "./catalog";

export type IndexItem = {
  id: string; slug: string; name: string; brand: string; brandName: string; category: string; categoryName: string; department: string;
  audience: string; featured: boolean; tags: string[]; collections: string[]; kind: ItemKind;
  /** Price a shopper pays (the sale price when there is one). */
  price: { amount: number; currency: string } | null;
  /** Regular price, only when the item is on sale. */
  compareAt: { amount: number; currency: string } | null;
  image: string | null; demo: boolean;
  availability: "in_stock" | "out_of_stock" | "unknown";
  /** True when a display in the 3D mall shows this product (so "show in mall" is possible). */
  inMall: boolean;
};

/** Which products the mall displays, using the live fixtures, pins and visibility from the database. */
export function mallDisplays(c: Catalog) {
  const names = new Map(c.brands.map((b) => [b.slug, b.name]));
  const hidden = new Set(c.departments.filter((d) => !d.showInMall).map((d) => d.slug as string));
  const mall = c.products.filter((p) => p.showInMall && !hidden.has(p.department)).map((p) => toMallProduct(p, names.get(p.brand) ?? p.brand, c.categories));
  return { mall, displays: assignProducts(mall, recordsToSlots(c.slots), c.pins) };
}

/** Light record list for search, favorites and the mobile shop rail. Built from the one database. */
export async function getIndex(): Promise<{ items: IndexItem[]; brands: { slug: string; name: string; demo: boolean; department: string | null; count: number }[] }> {
  const c = await getCatalog();
  const names = new Map(c.brands.map((b) => [b.slug, b.name]));
  const catNames = new Map(c.categories.map((x) => [x.slug, x.name]));
  const inMall = new Set(mallDisplays(c).displays.flatMap((d) => d.products.map((p) => p.id)));
  const items = c.products.map((p): IndexItem => ({
    id: p.id, slug: p.slug, name: p.name, brand: p.brand, brandName: names.get(p.brand) ?? p.brand, category: p.category, categoryName: catNames.get(p.category) ?? p.category,
    department: p.department, audience: p.audience, featured: p.featured, tags: p.tags, collections: p.collections, kind: kindForCategory(c.categories, p.category),
    price: effectivePrice(p), compareAt: p.salePrice ? p.price : null, image: p.images[0]?.url ?? null, demo: p.source.kind === "demo",
    availability: resolveStock(p).availability, inMall: inMall.has(p.id),
  }));
  return {
    items,
    brands: c.brands.map((b) => {
      const mine = c.products.filter((p) => p.brand === b.slug);
      const top = new Map<string, number>(); mine.forEach((p) => top.set(p.department, (top.get(p.department) ?? 0) + 1));
      return { slug: b.slug, name: b.name, demo: b.demo, department: [...top].sort((a, b2) => b2[1] - a[1])[0]?.[0] ?? null, count: mine.length };
    }).filter((b) => b.count > 0),
  };
}
