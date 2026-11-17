"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** Where the visitor last was in each mode, so switching mode returns to the same product, room and filters. */
type NavMemory = { shopHref: string; exploreHref: string; setShop: (h: string) => void; setExplore: (h: string) => void };

export const useNavMemory = create<NavMemory>()(
  persist(
    (set) => ({ shopHref: "/shop", exploreHref: "/", setShop: (shopHref) => set({ shopHref }), setExplore: (exploreHref) => set({ exploreHref }) }),
    { name: "vestora-nav-memory", storage: createJSONStorage(() => sessionStorage) },
  ),
);
