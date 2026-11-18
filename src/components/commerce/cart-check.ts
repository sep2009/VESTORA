"use client";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/stores/cart-store";

export type CheckedLine = {
  productId: string; sku: string | null; size: string | null; color: string | null; quantity: number;
  ok: boolean; issues: string[]; maxQuantity: number | null;
  product: { name: string; slug: string; image: string | null; brandName: string } | null;
  options: { sku: string; size: string | null; color: string | null; available: number }[];
  unitRegular: number | null; unitPrice: number | null; currency: string | null;
};
export type ShippingOption = { id: string; label: string; estimate: string; price: number };
export type Totals = { currency: string; subtotalRegular: number; discount: number; subtotal: number; shipping: number; total: number };
export type CartCheck = { lines: CheckedLine[]; shippingOptions: ShippingOption[]; totals: Totals | null; errors: string[]; payments: { provider: string; label: string; test: boolean } | null };

/** Asks the server to price and validate the cart (the numbers on screen are the server's, not the browser's). Debounced; re-runs when the cart or destination changes. */
export function useCartCheck(country?: string | null, method?: string | null) {
  const lines = useCart((s) => s.lines);
  const [state, setState] = useState<{ data: CartCheck | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  const sig = useMemo(() => JSON.stringify([lines.map((l) => [l.productId, l.sku, l.size, l.color, l.quantity]), country ?? null, method ?? null]), [lines, country, method]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (lines.length === 0) { setState({ data: null, loading: false, error: null }); return; }
    setState((s) => ({ ...s, loading: true, error: null }));
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch("/api/cart/validate", {
        method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", "X-Vestora-CSRF": "1" },
        body: JSON.stringify({ lines: lines.map((l) => ({ productId: l.productId, sku: l.sku, size: l.size, color: l.color, quantity: l.quantity })), country: country ?? undefined, method: method ?? undefined }),
      }).then(async (r) => { if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { errors?: string[] }).errors?.[0] ?? "Could not check your cart"); return r.json() as Promise<CartCheck>; })
        .then((data) => setState({ data, loading: false, error: null }))
        .catch((e: Error) => { if (e.name !== "AbortError") setState({ data: null, loading: false, error: e.message }); });
    }, 200);
    return () => { clearTimeout(t); ctl.abort(); };
    // sig captures every input; tick forces a re-check
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, tick]);
  return { ...state, lines, retry: () => setTick((n) => n + 1) };
}
