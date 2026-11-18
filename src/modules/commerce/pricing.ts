import type { OrderTotals } from "./types";

type PricedLine = { unitRegular: number; unitPrice: number; quantity: number };

/** Totals from priced lines. Discount is the sum of list-price savings (sale prices); there are no coupon codes. */
export function computeTotals(lines: readonly PricedLine[], shipping: number, currency: string): OrderTotals {
  const subtotalRegular = lines.reduce((n, l) => n + l.unitRegular * l.quantity, 0);
  const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
  return { currency, subtotalRegular, discount: subtotalRegular - subtotal, subtotal, shipping, total: subtotal + shipping };
}
