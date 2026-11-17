"use client";
import { create } from "zustand";
import type { ZoneId } from "@/modules/showroom/types";

export type CameraMode = "guided" | "explore" | "focus";
export type Focus = { kind: "zone"; zoneId: ZoneId } | { kind: "product"; productId: string; zoneId: ZoneId };

/** What the UI needs to know. The camera itself is driven only by the camera manager. */
type CameraState = {
  mode: CameraMode;
  focus: Focus | null;
  /** Zone the camera is looking at or has been sent to. */
  currentZoneId: ZoneId | null;
  /** Catalog id of the product under the pointer. */
  hoverProductId: string | null;
  guided: { index: number; count: number; label: string };
  /** How many focus levels can be undone with Back. */
  backDepth: number;
  transitioning: boolean;
};

export const useCameraStore = create<CameraState>(() => ({
  mode: "explore",
  focus: null,
  currentZoneId: null,
  hoverProductId: null,
  guided: { index: 0, count: 13, label: "The mall" },
  backDepth: 0,
  transitioning: false,
}));

export const selectFocusedZoneId = (s: CameraState) => (s.focus ? s.focus.zoneId : null);
export const selectFocusedProductId = (s: CameraState) => (s.focus?.kind === "product" ? s.focus.productId : null);
