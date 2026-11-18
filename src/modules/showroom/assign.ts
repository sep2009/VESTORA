import { kindForCategory } from "@/modules/catalog/kinds";
import type { Category, Product } from "@/modules/catalog/types";
import { effectivePrice, isDemo, resolveStock } from "@/modules/catalog/types";
import { kindModel } from "./assets/manifest";
import { SLOTS } from "./displays";
import type { DisplaySlot, ItemKind, MallProduct, ResolvedDisplay, SlotAccepts } from "./types";

const FOOTWEAR: ItemKind[] = ["sneaker"];
const ACCESSORY: ItemKind[] = ["bag", "watch", "glasses"];
export const productClass = (k: ItemKind): Exclude<SlotAccepts, "any"> => (FOOTWEAR.includes(k) ? "footwear" : ACCESSORY.includes(k) ? "accessory" : "garment");
const single = (s: DisplaySlot) => s.capacity === 1;

/** Catalog record → what the mall draws. The id stays the catalog id. The shape comes from the product's category; the model only if the record has one. */
export function toMallProduct(p: Product, brandName: string, categories: readonly Pick<Category, "slug" | "kind">[]): MallProduct {
  const kind = kindForCategory(categories, p.category);
  const colors = resolveStock(p).colors;
  return { id: p.id, slug: p.slug, name: p.name, brandName, kind, color: colors[0]?.hex ?? p.colors[0]?.hex ?? "#b6b0a4", demo: isDemo(p), modelUrl: p.model3d?.url ?? kindModel(kind), department: p.department, price: effectivePrice(p), availability: resolveStock(p).availability, image: p.images[0]?.url ?? null };
}

/**
 * Puts catalog products into the department's fixtures. Deterministic. Single-product fixtures (mannequins,
 * plinths) are filled first, then the remaining products are shared out across racks, tables and shelves.
 * Fixtures that receive nothing are NOT drawn, so there are never empty displays, and a product that fits
 * no fixture simply is not shown in the mall (it stays in the shop).
 */
export function assignProducts(products: readonly MallProduct[], slots: readonly DisplaySlot[] = SLOTS, pins: Readonly<Record<string, string>> = {}): ResolvedDisplay[] {
  const out = new Map<string, MallProduct[]>();
  const cls = new Map<string, SlotAccepts>();
  // Manual pins (set in the admin showroom editor) are placed first; invalid or full pins fall back to automatic placement.
  const pinned = new Set<string>();
  for (const p of products) {
    const slot = slots.find((s) => s.id === pins[p.id]);
    if (!slot || slot.departmentId !== p.department) continue;
    const c = productClass(p.kind);
    if (slot.accepts !== "any" && slot.accepts !== c) continue;
    if (cls.has(slot.id) && cls.get(slot.id) !== c) continue;
    const held = out.get(slot.id) ?? [];
    if (held.length >= slot.capacity) continue;
    out.set(slot.id, [...held, p]); cls.set(slot.id, c); pinned.add(p.id);
  }
  const depts = [...new Set(slots.map((s) => s.departmentId))];
  for (const dept of depts) {
    const deptSlots = slots.filter((s) => s.departmentId === dept);
    const queue = products.filter((p) => p.department === dept && !pinned.has(p.id));
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
