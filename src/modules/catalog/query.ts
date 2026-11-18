import { effectivePrice, resolveStock, type Brand, type Category, type Money, type Product } from "./types";

/** Pure search / filter / sort over catalog records. Used by the shop, the search palette and the tests. */
export type Query = {
  q?: string; brand?: string[]; category?: string[]; department?: string[]; audience?: string[]; collection?: string[]; size?: string[]; color?: string[];
  min?: number; max?: number; available?: boolean; sort?: "relevance" | "price-asc" | "price-desc" | "name" | "featured";
};

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Search text: name, brand, category and department. Every term must match somewhere. */
export function matchScore(p: { name: string; category: string; department: string; description?: string; tags?: readonly string[] }, brandName: string, q: string): number {
  const terms = norm(q).split(/[^a-z0-9]+/).filter(Boolean);
  if (terms.length === 0) return 1;
  const name = norm(p.name), brand = norm(brandName), rest = norm(`${p.category} ${p.department} ${(p.tags ?? []).join(" ")} ${p.description ?? ""}`);
  let score = 0;
  for (const t of terms) {
    if (name.startsWith(t) || name.includes(` ${t}`)) score += 4;
    else if (name.includes(t)) score += 3;
    else if (brand.includes(t)) score += 3;
    else if (rest.includes(t)) score += 1;
    else return 0;
  }
  return score;
}

export function queryProducts(products: readonly Product[], brands: readonly Brand[], query: Query): Product[] {
  const brandName = new Map(brands.map((b) => [b.slug, b.name]));
  const has = (a: string[] | undefined) => !!a && a.length > 0;
  const scored = products.map((p) => ({ p, s: matchScore(p, brandName.get(p.brand) ?? p.brand, query.q ?? "") }));
  const out = scored.filter(({ p, s }) => {
    const r = resolveStock(p), price = effectivePrice(p);
    return s > 0 &&
      (!has(query.brand) || query.brand!.includes(p.brand)) &&
      (!has(query.category) || query.category!.includes(p.category)) &&
      (!has(query.department) || query.department!.includes(p.department)) &&
      (!has(query.audience) || query.audience!.includes(p.audience)) &&
      (!has(query.collection) || p.collections.some((c) => query.collection!.includes(c))) &&
      (!has(query.size) || (r.sizesVerified && r.sizes.some((v) => query.size!.includes(v)))) &&
      (!has(query.color) || r.colors.some((c) => query.color!.includes(c.name))) &&
      (query.min === undefined || (!!price && price.amount >= query.min * 100)) &&
      (query.max === undefined || (!!price && price.amount <= query.max * 100)) &&
      (!query.available || r.availability === "in_stock");
  });
  const cost = (p: Product, none: number) => effectivePrice(p)?.amount ?? none;
  const by = query.sort ?? (query.q ? "relevance" : "name");
  out.sort((a, b) =>
    by === "price-asc" ? cost(a.p, Infinity) - cost(b.p, Infinity)
    : by === "price-desc" ? cost(b.p, -1) - cost(a.p, -1)
    : by === "featured" ? Number(b.p.featured) - Number(a.p.featured) || a.p.name.localeCompare(b.p.name)
    : by === "relevance" ? b.s - a.s || a.p.name.localeCompare(b.p.name)
    : a.p.name.localeCompare(b.p.name));
  return out.map((x) => x.p);
}

export type Facets = {
  brands: { slug: string; name: string; count: number }[];
  categories: { value: string; label: string; count: number }[];
  departments: { value: string; count: number }[];
  audiences: { value: string; count: number }[];
  collections: { value: string; count: number }[];
  /** Present only when at least one product has verified sizes. */
  sizes: string[];
  colors: string[];
  /** Present only when every priced product shares one currency (so a range is meaningful). */
  price: { min: number; max: number; currency: string } | null;
  anyUnavailable: boolean;
};

/** Which filters the data can honestly support. The UI only shows what is returned here. */
export function facets(products: readonly Product[], brands: readonly Brand[], categories: readonly Pick<Category, "slug" | "name">[] = []): Facets {
  const count = <T,>(vals: T[]) => { const m = new Map<T, number>(); vals.forEach((v) => m.set(v, (m.get(v) ?? 0) + 1)); return m; };
  const bn = new Map(brands.map((b) => [b.slug, b.name]));
  const prices = products.map((p) => effectivePrice(p)).filter((x): x is Money => !!x);
  const currencies = new Set(prices.map((x) => x.currency));
  const cn = new Map(categories.map((c) => [c.slug, c.name]));
  const sizes = new Set<string>(), colors = new Set<string>();
  products.forEach((p) => { const r = resolveStock(p); if (r.sizesVerified) r.sizes.forEach((s) => sizes.add(s)); if (r.colorsVerified) r.colors.forEach((c) => colors.add(c.name)); });
  const sizeOrder = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
  const sortSize = (a: string, b: string) => { const ia = sizeOrder.indexOf(a), ib = sizeOrder.indexOf(b); return ia >= 0 && ib >= 0 ? ia - ib : a.localeCompare(b, undefined, { numeric: true }); };
  return {
    brands: [...count(products.map((p) => p.brand))].map(([slug, n]) => ({ slug, name: bn.get(slug) ?? slug, count: n })).sort((a, b) => a.name.localeCompare(b.name)),
    categories: [...count(products.map((p) => p.category))].map(([value, n]) => ({ value, label: cn.get(value) ?? value, count: n })).sort((a, b) => a.label.localeCompare(b.label)),
    departments: [...count(products.map((p) => p.department))].map(([value, n]) => ({ value, count: n })),
    audiences: [...count(products.map((p) => p.audience))].map(([value, n]) => ({ value, count: n })),
    collections: [...count(products.flatMap((p) => p.collections))].map(([value, n]) => ({ value, count: n })).sort((a, b) => a.value.localeCompare(b.value)),
    sizes: [...sizes].sort(sortSize),
    colors: [...colors].sort(),
    price: prices.length > 0 && currencies.size === 1 ? { min: Math.floor(Math.min(...prices.map((x) => x.amount)) / 100), max: Math.ceil(Math.max(...prices.map((x) => x.amount)) / 100), currency: [...currencies][0]! } : null,
    anyUnavailable: products.some((p) => resolveStock(p).availability !== "in_stock"),
  };
}

export function parseQuery(sp: Record<string, string | string[] | undefined>): Query {
  const list = (v: string | string[] | undefined) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]).filter(Boolean));
  const one = (v: string | string[] | undefined) => list(v)[0];
  const num = (v: string | string[] | undefined) => { const n = Number(one(v)); return one(v) !== undefined && one(v) !== "" && Number.isFinite(n) ? n : undefined; };
  const sort = one(sp.sort);
  return {
    q: one(sp.q)?.trim() || undefined, brand: list(sp.brand), category: list(sp.category), department: list(sp.dept), audience: list(sp.audience), collection: list(sp.collection), size: list(sp.size), color: list(sp.color),
    min: num(sp.min), max: num(sp.max), available: one(sp.available) === "1",
    sort: sort === "price-asc" || sort === "price-desc" || sort === "name" || sort === "relevance" || sort === "featured" ? sort : undefined,
  };
}
