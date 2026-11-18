import { colorsInStock, hexFor, purchaseIssue, variantOf, type Pick, type Picks, type Slot, SLOTS, type StudioItem } from "@/modules/outfit/core";
import type { CartLine } from "@/stores/cart-store";
import type { WornItem } from "./avatar3d/adapter";

export type Resolve = (id: string) => StudioItem | undefined;
export const defaultColor = (i: StudioItem): string | null => colorsInStock(i)[0]?.name ?? i.colors[0]?.name ?? null;

/** What the avatar wears: every picked item that still exists in the catalog, with the chosen (or default) color. */
export function wornItems(picks: Picks, resolve: Resolve): WornItem[] {
  const out: WornItem[] = [];
  for (const s of SLOTS) { const p = picks[s]; const it = p && resolve(p.productId); if (p && it) out.push({ slot: s, item: it, colorHex: hexFor(it, p.color ?? defaultColor(it)) }); }
  return out;
}
/** New pick after a variant change; the SKU follows from size + color. */
export function withVariant(item: StudioItem, p: Pick, change: { size?: string | null; color?: string | null }): Pick {
  const next: Pick = { ...p, ...("size" in change ? { size: change.size ?? null } : {}), ...("color" in change ? { color: change.color ?? null } : {}) };
  return { ...next, sku: variantOf(item, next)?.sku ?? null };
}
export type CartPlan = { lines: Omit<CartLine, "key" | "quantity">[]; skipped: { name: string; reason: string }[] };
/** Items that can really be bought right now go to the cart; every other item is listed with the reason. */
export function planCart(picks: Picks, resolve: Resolve): CartPlan {
  const lines: CartPlan["lines"] = [], skipped: CartPlan["skipped"] = [];
  for (const s of SLOTS) {
    const p = picks[s]; if (!p) continue;
    const it = resolve(p.productId); const issue = purchaseIssue(it, p);
    if (!it || issue) { skipped.push({ name: it?.name ?? "An item", reason: issue ?? "unavailable" }); continue; }
    const v = variantOf(it, p);
    lines.push({ productId: it.id, slug: it.slug, name: it.name, brandName: it.brandName, image: it.image, sku: v?.sku ?? null, size: p.size, color: p.color ?? (it.colors.length === 1 ? it.colors[0]!.name : null), unitPrice: it.price, source: { kind: it.sourceKind, retailer: it.retailer, url: it.sourceUrl } });
  }
  return { lines, skipped };
}
export function totalsFor(picks: Picks, resolve: Resolve, onlyBuyable: boolean): { currency: string; amount: number }[] {
  const m = new Map<string, number>();
  for (const s of SLOTS as readonly Slot[]) { const p = picks[s]; const it = p && resolve(p.productId); if (!it?.price) continue; if (onlyBuyable && !it.available) continue; m.set(it.price.currency, (m.get(it.price.currency) ?? 0) + it.price.amount); }
  return [...m].map(([currency, amount]) => ({ currency, amount }));
}
