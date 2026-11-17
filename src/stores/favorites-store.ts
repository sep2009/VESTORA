"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProductId } from "@/domain";

type FavoritesState = { ids: ProductId[]; toggle: (id: ProductId) => boolean };

/** Returns true when the product is now a favorite. Ids only; product data stays in the catalog. */
export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const has = get().ids.includes(id);
        set({ ids: has ? get().ids.filter((x) => x !== id) : [...get().ids, id] });
        return !has;
      },
    }),
    { name: "vestora-favorites" },
  ),
);
