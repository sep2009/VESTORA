import type { Money } from "@/domain";

export function formatMoney({ amount, currency }: Money): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}
