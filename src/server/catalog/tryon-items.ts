import "server-only";
import { garmentCategoryFor, type GarmentCategory } from "@/modules/tryon/core";
import type { StudioItem } from "@/modules/outfit/core";
import { getCatalog } from "./catalog";
import { getStudioItems } from "./studio";
import { providerStatus } from "@/server/tryon/providers";

export type TryOnItem = StudioItem & {
  /** The product's own 3D model, if it has one. */
  model: { url: string; license: string | null } | null;
  /** Whether AI photo try-on can be offered for this product right now, and why not. */
  photo: { supported: boolean; category: GarmentCategory | null; reason: string | null };
};

/** Every try-on decision is made here, from real product records: what the product is, whether it has a 3D model, whether the configured provider can handle it. */
export function getTryOnItems(): TryOnItem[] {
  const c = getCatalog(), st = providerStatus();
  const byId = new Map(c.products.map((p) => [p.id, p]));
  return getStudioItems().map((it) => {
    const p = byId.get(it.id)!;
    const category = garmentCategoryFor(it.kind);
    let reason: string | null = null;
    if (!st.available) reason = "AI photo try-on is not available (no provider configured).";
    else if (!category) reason = "AI photo try-on supports tops, bottoms, dresses and jackets, not this kind of product.";
    else if (!st.provider.supports.includes(category)) reason = "The configured service does not support this garment category.";
    else if (!p.images[0]) reason = "This product has no picture to try on.";
    else if (it.demo && !st.provider.test) reason = "Demo products have no real garment photo.";
    return { ...it, model: p.model3d ? { url: p.model3d.url, license: p.model3d.license } : null, photo: { supported: reason === null, category, reason } };
  });
}
