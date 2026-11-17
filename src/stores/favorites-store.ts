"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type FavoritesState = { ids: string[]; toggle: (id: string) => boolean };

/** Catalog product ids only; product data always comes from the catalog. Returns true when the product is now a favorite. */
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
    { name: "vestora-favorites-v2" },
  ),
);
