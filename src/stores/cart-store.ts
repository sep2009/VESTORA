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
