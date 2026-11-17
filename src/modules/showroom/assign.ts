import { CATEGORY_KIND } from "@/modules/catalog/kinds";
import type { Product } from "@/modules/catalog/types";
import { isDemo } from "@/modules/catalog/types";
import { kindModel } from "./assets/manifest";
import { SLOTS } from "./displays";
import type { DisplaySlot, ItemKind, MallProduct, ResolvedDisplay, SlotAccepts } from "./types";

const FOOTWEAR: ItemKind[] = ["sneaker"];
const ACCESSORY: ItemKind[] = ["bag", "watch", "glasses"];
export const productClass = (k: ItemKind): Exclude<SlotAccepts, "any"> => (FOOTWEAR.includes(k) ? "footwear" : ACCESSORY.includes(k) ? "accessory" : "garment");
const single = (s: DisplaySlot) => s.capacity === 1;

/** Catalog record → what the mall draws. The id stays the catalog id. Colour comes from the record's first listed colour. */
export function toMallProduct(p: Product, brandName: string): MallProduct {
  const kind = CATEGORY_KIND[p.category];
  return { id: p.id, slug: p.slug, name: p.name, brandName, kind, color: p.colors[0]?.hex ?? "#b6b0a4", demo: isDemo(p), modelUrl: kindModel(kind), department: p.department, price: p.price, availability: p.availability, image: p.images[0]?.url ?? null };
}

/**
 * Puts catalog products into the department's fixtures. Deterministic. Single-product fixtures (mannequins,
 * plinths) are filled first, then the remaining products are shared out across racks, tables and shelves.
 * Fixtures that receive nothing are NOT drawn, so there are never empty displays, and a product that fits
 * no fixture simply is not shown in the mall (it stays in the shop).
 */
export function assignProducts(products: readonly MallProduct[], slots: readonly DisplaySlot[] = SLOTS): ResolvedDisplay[] {
  const out = new Map<string, MallProduct[]>();
  const cls = new Map<string, SlotAccepts>();
  const depts = [...new Set(slots.map((s) => s.departmentId))];
  for (const dept of depts) {
    const deptSlots = slots.filter((s) => s.departmentId === dept);
    const queue = products.filter((p) => p.department === dept);
    for (const c of ["garment", "footwear", "accessory"] as const) {
      const list = queue.filter((p) => productClass(p.kind) === c);
      const fits = (s: DisplaySlot) => (s.accepts === c || s.accepts === "any") && (!cls.has(s.id) || cls.get(s.id) === c);
      const singles = deptSlots.filter((s) => single(s) && fits(s) && !(out.get(s.id)?.length));
      const multis = deptSlots.filter((s) => !single(s) && fits(s));
      let i = 0;
      for (const s of singles) { if (i >= list.length) break; out.set(s.id, [list[i++]!]); cls.set(s.id, c); }
      let left = list.length - i, remaining = multis.length;
      for (const s of multis) {
        if (left <= 0) break;
        const take = Math.min(s.capacity - (out.get(s.id)?.length ?? 0), Math.max(1, Math.ceil(left / remaining)));
        out.set(s.id, [...(out.get(s.id) ?? []), ...list.slice(i, i + take)]); cls.set(s.id, c);
        i += take; left -= take; remaining--;
      }
    }
  }
  return slots.filter((s) => (out.get(s.id)?.length ?? 0) > 0).map((slot) => ({ slot, products: out.get(slot.id)! }));
}

/** Which mall slot shows a product (if any). */
export const slotOfProduct = (displays: readonly ResolvedDisplay[], productId: string) => displays.find((d) => d.products.some((p) => p.id === productId))?.slot;
