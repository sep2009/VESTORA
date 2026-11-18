"use client";
import { create } from "zustand";
/** True once the 3D mall has built its first frame's worth of content (textures, fixtures, products). */
export const useSceneReady = create<{ ready: boolean; set: (r: boolean) => void }>((set) => ({ ready: false, set: (ready) => set({ ready }) }));
