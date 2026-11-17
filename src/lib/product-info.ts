import type { Money, Product } from "@/domain";

export type StockLevel = "in" | "low" | "out";

export function stockLevel(p: Product): StockLevel {
  const total = p.variants.reduce((n, v) => n + v.inventory.quantityAvailable, 0);
  return total === 0 ? "out" : total <= 5 ? "low" : "in";
}

export function priceRange(p: Product): { min: Money; max: Money } | null {
  const prices = p.variants.map((v) => v.price);
  const first = prices[0];
  if (!first) return null;
  const amounts = prices.map((x) => x.amount);
  return { min: { amount: Math.min(...amounts), currency: first.currency }, max: { amount: Math.max(...amounts), currency: first.currency } };
}
