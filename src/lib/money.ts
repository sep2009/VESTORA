import type { Money } from "@/modules/catalog/types";

/** Prices are integer minor units; never format a price that is not in the record. */
export function formatMoney({ amount, currency }: Money): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}
