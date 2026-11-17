import "server-only";
import { assignProducts, toMallProduct } from "@/modules/showroom/assign";
import { getCatalog } from "./catalog";

export type IndexItem = {
  id: string; slug: string; name: string; brand: string; brandName: string; category: string; department: string;
  price: { amount: number; currency: string } | null; image: string | null; demo: boolean;
  availability: "in_stock" | "out_of_stock" | "unknown";
  /** True when a display in the 3D mall shows this product (so "show in mall" is possible). */
  inMall: boolean;
};

/** Light record list for search, favorites and the mobile shop rail. Built from the one catalog. */
export function getIndex(): { items: IndexItem[]; brands: { slug: string; name: string; demo: boolean; department: string | null; count: number }[] } {
  const { products, brands } = getCatalog();
  const names = new Map(brands.map((b) => [b.slug, b.name]));
  const inMall = new Set(assignProducts(products.map((p) => toMallProduct(p, names.get(p.brand) ?? p.brand))).flatMap((d) => d.products.map((p) => p.id)));
  const items = products.map((p): IndexItem => ({
    id: p.id, slug: p.slug, name: p.name, brand: p.brand, brandName: names.get(p.brand) ?? p.brand, category: p.category, department: p.department,
    price: p.price, image: p.images[0]?.url ?? null, demo: p.source.kind === "demo", availability: p.availability, inMall: inMall.has(p.id),
  }));
  return {
    items,
    brands: brands.map((b) => {
      const mine = products.filter((p) => p.brand === b.slug);
      const top = new Map<string, number>(); mine.forEach((p) => top.set(p.department, (top.get(p.department) ?? 0) + 1));
      return { slug: b.slug, name: b.name, demo: b.demo, department: [...top].sort((a, b2) => b2[1] - a[1])[0]?.[0] ?? null, count: mine.length };
    }).filter((b) => b.count > 0),
  };
}
