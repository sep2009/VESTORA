"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/domain";

type CartState = {
  lines: CartLine[];
  add: (line: CartLine) => void;
  remove: (variantId: CartLine["variantId"]) => void;
  setQuantity: (variantId: CartLine["variantId"], quantity: number) => void;
  clear: () => void;
};

/** Client cart holds identity + quantity only; prices are always re-read from the catalog. */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((s) => {
          const existing = s.lines.find((l) => l.variantId === line.variantId);
          return existing
            ? { lines: s.lines.map((l) => l.variantId === line.variantId ? { ...l, quantity: Math.min(20, l.quantity + line.quantity) } : l) }
            : { lines: [...s.lines, line] };
        }),
      remove: (variantId) => set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) })),
      setQuantity: (variantId, quantity) =>
        set((s) => ({
          lines: quantity < 1
            ? s.lines.filter((l) => l.variantId !== variantId)
            : s.lines.map((l) => l.variantId === variantId ? { ...l, quantity: Math.min(20, quantity) } : l),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: "vestora-cart" },
  ),
);
