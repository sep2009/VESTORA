"use client";
import { create } from "zustand";

export type Quality = "high" | "lite";
type QualityState = { level: Quality; manual: boolean; set: (q: Quality, manual?: boolean) => void };

export const useQuality = create<QualityState>((set) => ({
  level: "high",
  manual: false,
  set: (level, manual = false) => set({ level, manual }),
}));

/** Weak or touch-first devices start in Lite: no post-processing, smaller shadow and texture sizes. */
export function detectQuality(): Quality {
  if (typeof navigator === "undefined") return "high";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
  return coarse || weak || window.innerWidth < 700 ? "lite" : "high";
}
