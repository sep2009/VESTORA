"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Money } from "@/modules/catalog/types";

/**
 * One cart for both modes. Every line keeps the catalog product id, the chosen size and colour, the quantity,
 * the price the shopper saw, and where the product comes from, so nothing is lost when switching mode.
 */
export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  brandName: string;
  image: string | null;
  /** Variant SKU when the product has variants. */
  sku: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: Money | null;
  source: { kind: "official" | "affiliate-feed" | "manual-verified" | "demo"; retailer: string | null; url: string | null };
};

export const lineKey = (productId: string, size: string | null, color: string | null) => `${productId}|${size ?? "-"}|${color ?? "-"}`;

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "key" | "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  /** Switch a line to another size/color (variant). Merges with an existing line for that variant. */
  changeVariant: (key: string, to: { sku: string; size: string | null; color: string | null }) => void;
  /** Remove lines by key (used after a confirmed order). */
  removeMany: (keys: string[]) => void;
  remove: (key: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line, quantity = 1) => set((s) => {
        const key = lineKey(line.productId, line.size, line.color);
        const hit = s.lines.find((l) => l.key === key);
        return hit
          ? { lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l)) }
          : { lines: [...s.lines, { ...line, key, quantity: Math.min(20, quantity) }] };
      }),
      setQuantity: (key, quantity) => set((s) => ({ lines: quantity < 1 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, quantity) } : l)) })),
      changeVariant: (key, to) => set((s) => {
        const line = s.lines.find((l) => l.key === key);
        if (!line) return s;
        const nk = lineKey(line.productId, to.size, to.color);
        const moved = { ...line, key: nk, sku: to.sku, size: to.size, color: to.color };
        const others = s.lines.filter((l) => l.key !== key);
        const hit = others.find((l) => l.key === nk);
        return { lines: hit ? others.map((l) => (l.key === nk ? { ...l, quantity: Math.min(20, l.quantity + line.quantity) } : l)) : s.lines.map((l) => (l.key === key ? moved : l)) };
      }),
      removeMany: (keys) => set((s) => ({ lines: s.lines.filter((l) => !keys.includes(l.key)) })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
    }),
    { name: "vestora-cart-v2" },
  ),
);

/** Totals per currency: never add prices in different currencies together. */
export function totals(lines: readonly CartLine[]): { currency: string; amount: number }[] {
  const m = new Map<string, number>();
  for (const l of lines) if (l.unitPrice) m.set(l.unitPrice.currency, (m.get(l.unitPrice.currency) ?? 0) + l.unitPrice.amount * l.quantity);
  return [...m].map(([currency, amount]) => ({ currency, amount }));
}
