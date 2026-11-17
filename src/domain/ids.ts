import { z } from "zod";

/** Branded ids: a ProductId can never be passed where a VariantId is expected. */
export const productId = z.uuid().brand<"ProductId">();
export const variantId = z.uuid().brand<"VariantId">();
export const userId = z.uuid().brand<"UserId">();
export const outfitId = z.uuid().brand<"OutfitId">();
export const cartId = z.uuid().brand<"CartId">();
export const orderId = z.uuid().brand<"OrderId">();

export type ProductId = z.infer<typeof productId>;
export type VariantId = z.infer<typeof variantId>;
export type UserId = z.infer<typeof userId>;
export type OutfitId = z.infer<typeof outfitId>;
export type CartId = z.infer<typeof cartId>;
export type OrderId = z.infer<typeof orderId>;

export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
/** Money is always integer minor units (cents) plus an ISO currency code. */
export const money = z.object({
  amount: z.number().int().nonnegative(),
  currency: z.string().length(3),
});
export type Money = z.infer<typeof money>;
