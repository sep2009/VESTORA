import type { ItemKind } from "@/modules/showroom/types";

/** The few fields recommendations need. Items always come from the product database, never from a separate list. */
export type Rec = {
  id: string; department: string; category: string; kind: ItemKind; audience: string; brand: string;
  tags: string[]; collections: string[]; featured: boolean; availability: "in_stock" | "out_of_stock" | "unknown";
  price: { amount: number; currency: string } | null;
};
export type Recommendations<T> = { similar: T[]; matching: T[]; department: T[]; accessories: T[] };

const TOPS: ItemKind[] = ["tee", "shirt", "hoodie", "jacket", "coat"];
const ACCESSORIES: ItemKind[] = ["bag", "watch", "glasses"];
/** What goes with what: the kinds that pair with a given kind. */
const PAIRS: Record<ItemKind, ItemKind[]> = {
  tee: ["trousers", "jacket", "coat"], shirt: ["trousers", "suit", "jacket"], hoodie: ["trousers", "sneaker"], jacket: ["tee", "shirt", "trousers"], coat: ["shirt", "trousers", "dress"],
  dress: ["jacket", "coat", "sneaker"], suit: ["shirt", "sneaker"], trousers: [...TOPS, "sneaker"], sneaker: ["trousers", "hoodie", "tee"],
  bag: ["dress", "coat", "jacket"], watch: ["suit", "shirt"], glasses: ["tee", "shirt", "jacket"],
};
const audienceOk = (a: string, b: string) => a === b || a === "unisex" || b === "unisex";

/** Higher is a closer relative. Sold-out items are ranked below available ones, never promoted. */
function affinity(p: Rec, o: Rec): number {
  let s = 0;
  s += o.tags.filter((t) => p.tags.includes(t)).length * 2;
  s += o.collections.filter((c) => p.collections.includes(c)).length * 2;
  if (o.brand === p.brand) s += 2;
  if (o.department === p.department) s += 1;
  if (o.featured) s += 0.5;
  if (p.price && o.price && p.price.currency === o.price.currency) s += 1 / (1 + Math.abs(o.price.amount - p.price.amount) / Math.max(1, p.price.amount));
  if (o.availability === "out_of_stock") s -= 3;
  return s;
}

/** Deterministic: ties break on id. Each product appears in at most one group, in the order similar, matching, accessories, department. */
export function recommend<T extends Rec>(product: Rec, all: readonly T[], limit = 4): Recommendations<T> {
  const used = new Set<string>([product.id]);
  const pick = (filter: (o: T) => boolean): T[] => {
    const out = all.filter((o) => !used.has(o.id) && audienceOk(product.audience, o.audience) && filter(o))
      .sort((a, b) => affinity(product, b) - affinity(product, a) || a.id.localeCompare(b.id)).slice(0, limit);
    out.forEach((o) => used.add(o.id));
    return out;
  };
  const similar = pick((o) => o.category === product.category || o.kind === product.kind);
  const matching = pick((o) => PAIRS[product.kind].includes(o.kind) && !ACCESSORIES.includes(o.kind) && (o.department === product.department || o.brand === product.brand || o.collections.some((c) => product.collections.includes(c))));
  const accessories = ACCESSORIES.includes(product.kind) ? [] : pick((o) => ACCESSORIES.includes(o.kind));
  const department = pick((o) => o.department === product.department);
  return { similar, matching, department, accessories };
}
