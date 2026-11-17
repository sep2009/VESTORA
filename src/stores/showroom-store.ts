"use client";
import { create } from "zustand";

type ShowroomState = {
  /** Zone slug the camera is flying to, or null for the overview. */
  activeDepartmentSlug: string | null;
  /** Placement id of the selected display. Placement ids are unique per display, whether it shows a sample or a catalog product. */
  focusedDisplayId: string | null;
  setDepartment: (slug: string | null) => void;
  focusDisplay: (id: string | null) => void;
};

export const useShowroom = create<ShowroomState>((set) => ({
  activeDepartmentSlug: null,
  focusedDisplayId: null,
  setDepartment: (activeDepartmentSlug) => set({ activeDepartmentSlug, focusedDisplayId: null }),
  focusDisplay: (focusedDisplayId) => set({ focusedDisplayId }),
}));
