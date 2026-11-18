"use client";
import { create } from "zustand";

/** Which room of the mall the stylist is pointing at. Highlights it on the minimap without moving the camera. */
export const useMallGuide = create<{ highlight: string | null; set: (zone: string | null) => void }>((set) => ({ highlight: null, set: (highlight) => set({ highlight }) }));
