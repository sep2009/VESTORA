/** Shipping methods and price rules. Prices are minor units of the order currency. Tax is not calculated. */
export type ShippingMethod = { id: string; label: string; estimate: string; price: number };

export const FREE_SHIPPING_OVER = 15_000; // 150.00 on the discounted subtotal, standard shipping only

const METHODS: Omit<ShippingMethod, "price">[] = [
  { id: "standard", label: "Standard", estimate: "5 to 7 working days" },
  { id: "express", label: "Express", estimate: "1 to 2 working days" },
];
const BASE: Record<string, number> = { standard: 590, express: 1490 };
const INTERNATIONAL_EXTRA = 600;

export function shippingOptions(country: string, subtotal: number): ShippingMethod[] {
  return METHODS.map((m) => {
    let price = (BASE[m.id] ?? 0) + (country === "US" ? 0 : INTERNATIONAL_EXTRA);
    if (m.id === "standard" && subtotal >= FREE_SHIPPING_OVER) price = 0;
    return { ...m, price };
  });
}
