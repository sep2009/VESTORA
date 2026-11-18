import type { AvatarConfig, StudioItem } from "@/modules/outfit/core";

/**
 * Seam for a professional avatar + garment-fitting solution.
 * The studio (state, matching, cart, saving) only passes `avatar` and `worn` to the 3D figure. Today `Figure.tsx` draws a
 * parametric mannequin with generic, body-fitted garment shapes (FIT_QUALITY "preview"). A real solution would load a rigged
 * avatar and garments authored or auto-fitted for the same skeleton (GLB with skin weights), accept the same props, and report
 * "authored" or "simulated" so the UI can drop the preview-mode notice for items that really are fitted.
 */
export type FitQuality = "preview" | "authored" | "simulated";
export type WornItem = { slot: string; item: StudioItem; colorHex: string };
export type AvatarProps = { avatar: AvatarConfig; worn: WornItem[] };
export const FIT_QUALITY: FitQuality = "preview";
