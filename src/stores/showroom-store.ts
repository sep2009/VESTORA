"use client";
import { create } from "zustand";
import type { ProductId } from "@/domain";

type ShowroomState = {
  activeDepartmentSlug: string | null;
  /** The product the camera is focused on; the same ProductId drives product page, cart and outfits. */
  focusedProductId: ProductId | null;
  setDepartment: (slug: string | null) => void;
  focusProduct: (id: ProductId | null) => void;
};

export const useShowroom = create<ShowroomState>((set) => ({
  activeDepartmentSlug: null,
  focusedProductId: null,
  setDepartment: (activeDepartmentSlug) => set({ activeDepartmentSlug, focusedProductId: null }),
  focusProduct: (focusedProductId) => set({ focusedProductId }),
}));
