import { z } from "zod";
import { cartId, orderId, productId, userId, variantId, money } from "./ids";

/** A cart line stores identity + quantity only. Price comes from the catalog at read time. */
export const cartLine = z.object({
  productId,
  variantId,
  quantity: z.number().int().min(1).max(20),
});
export type CartLine = z.infer<typeof cartLine>;

export const cart = z.object({
  id: cartId,
  userId: userId.nullable(),
  lines: z.array(cartLine),
});
export type Cart = z.infer<typeof cart>;

export const orderStatus = z.enum(["pending", "paid", "fulfilled", "cancelled", "refunded"]);

export const order = z.object({
  id: orderId,
  userId,
  status: orderStatus,
  /** Prices are snapshotted at purchase time. */
  lines: z.array(cartLine.extend({ unitPrice: money })),
  total: money,
  createdAt: z.iso.datetime(),
});
export type Order = z.infer<typeof order>;
