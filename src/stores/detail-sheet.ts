"use client";
import { create } from "zustand";

/** Which product's detail sheet is open over the 3D mall (by slug). The mall stays mounted underneath, so closing returns to the exact same view. */
type SheetState = { slug: string | null; open: (slug: string) => void; close: () => void };
export const useDetailSheet = create<SheetState>((set) => ({ slug: null, open: (slug) => set({ slug }), close: () => set({ slug: null }) }));
