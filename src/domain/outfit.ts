import { z } from "zod";
import { outfitId, productId, userId, variantId } from "./ids";

/** Outfits reference catalog products by id; they never copy product data. */
export const outfitItem = z.object({
  productId,
  variantId: variantId.nullable().default(null),
  slot: z.enum(["top", "bottom", "outerwear", "shoes", "accessory", "dress"]),
});
export type OutfitItem = z.infer<typeof outfitItem>;

export const outfit = z.object({
  id: outfitId,
  userId,
  name: z.string().min(1),
  items: z.array(outfitItem),
});
export type Outfit = z.infer<typeof outfit>;
