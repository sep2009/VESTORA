"use client";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { useCart, type CartLine } from "@/stores/cart-store";
import { Label } from "@/components/product/ProductLabel";
import { Spinner } from "@/components/feedback/States";
import type { CartCheck, CheckedLine } from "./cart-check";

const money = (amount: number, currency: string) => formatMoney({ amount, currency });

/** Cart lines with image, size, color, variant change, quantity and the server's stock/price messages. */
export function CartLinesView({ lines, check, editable, compact = false }: { lines: readonly CartLine[]; check: CartCheck | null; editable: boolean; compact?: boolean }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const changeVariant = useCart((s) => s.changeVariant);
  return (
    <ul className="divide-y divide-line border-y border-line">
      {lines.map((l, i) => {
        const c: CheckedLine | undefined = check?.lines[i];
        const image = c?.product?.image ?? l.image;
        const max = c?.maxQuantity ?? 20;
        const price = c?.unitPrice ?? l.unitPrice?.amount ?? null, regular = c?.unitRegular ?? price, cur = c?.currency ?? l.unitPrice?.currency ?? "USD";
        const variantOptions = (c?.options ?? []).filter((o) => o.size || o.color);
        return (
          <li key={l.key} className={compact ? "flex gap-3 py-4" : "flex gap-4 py-5"}>
            <Link href={`/product/${l.slug}`} className={`block shrink-0 overflow-hidden rounded-sm bg-ink/6 ${compact ? "h-20 w-16" : "h-28 w-24"}`}>
              {image &&   <img src={image} alt={`${l.name}`} className="size-full object-cover" />}
            </Link>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[11px] uppercase tracking-[0.16em] text-mute">{l.brandName}</p>
              <Link href={`/product/${l.slug}`} className="block font-medium hover:underline">{l.name}</Link>
              <p className="text-sm text-mute">{[l.size && `Size ${l.size}`, l.color].filter(Boolean).join(" · ") || "No options"}</p>
              {l.source.kind === "demo" && <Label kind="ink">Demo product</Label>}
              {c && !c.ok && <p role="alert" className="text-sm text-danger">{c.issues.join(" ")}{editable && c.maxQuantity && l.quantity > c.maxQuantity ? <> <button type="button" className="underline" onClick={() => setQuantity(l.key, c.maxQuantity!)}>Reduce to {c.maxQuantity}</button></> : null}</p>}
              {l.source.kind === "affiliate-feed" && l.source.url && <a href={l.source.url} target="_blank" rel="noopener noreferrer nofollow sponsored" className="text-xs uppercase tracking-[0.14em] text-accent-ink underline">Buy at {l.source.retailer ?? "the seller"} ↗</a>}
              {editable && variantOptions.length > 1 && (
                <label className="block text-xs text-mute">Change variant
                  <select className="mt-1 block h-9 w-full max-w-56 rounded-sm border border-line bg-surface px-2 text-sm text-ink" value={c?.sku ?? l.sku ?? ""} onChange={(e) => { const o = variantOptions.find((x) => x.sku === e.target.value); if (o) changeVariant(l.key, { sku: o.sku, size: o.size, color: o.color }); }}>
                    {variantOptions.map((o) => <option key={o.sku} value={o.sku} disabled={o.available === 0 && o.sku !== (c?.sku ?? l.sku)}>{[o.size, o.color].filter(Boolean).join(" / ")}{o.available === 0 ? " (sold out)" : o.available <= 3 ? ` (${o.available} left)` : ""}</option>)}
                  </select>
                </label>
              )}
              {editable ? (
                <div className="flex items-center gap-3 pt-1">
                  <div className="inline-flex items-center rounded-sm border border-line" role="group" aria-label={`Quantity for ${l.name}`}>
                    <button type="button" onClick={() => setQuantity(l.key, l.quantity - 1)} aria-label={`Decrease quantity of ${l.name}`} className="grid size-10 place-items-center">−</button>
                    <span className="w-8 text-center text-sm" aria-live="polite">{l.quantity}</span>
                    <button type="button" onClick={() => setQuantity(l.key, Math.min(max, l.quantity + 1))} disabled={l.quantity >= max} aria-label={`Increase quantity of ${l.name}`} className="grid size-10 place-items-center disabled:opacity-40">+</button>
                  </div>
                  <button type="button" onClick={() => remove(l.key)} className="text-xs uppercase tracking-[0.14em] text-mute underline hover:text-ink">Remove</button>
                </div>
              ) : <p className="text-sm text-mute">Quantity {l.quantity}</p>}
            </div>
            <p className="text-right text-sm">
              {price !== null ? money(price * l.quantity, cur) : "—"}
              {price !== null && regular !== null && regular > price && <s className="block text-xs text-mute">{money(regular * l.quantity, cur)}</s>}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/** Subtotal, discounts, shipping and total from the server. Shipping shows "at checkout" until a destination and method exist. */
export function SummaryView({ check, shipping = "later" }: { check: CartCheck | null; shipping?: "later" | "included" }) {
  const t = check?.totals;
  if (!t) return <p className="text-sm text-mute">No priced items yet.</p>;
  const row = (label: string, value: string, strong = false) => <div className={`flex justify-between ${strong ? "border-t border-line pt-2 text-base font-medium" : ""}`}><dt>{label}</dt><dd>{value}</dd></div>;
  return (
    <dl className="space-y-1.5 text-sm">
      {row("Items (list price)", money(t.subtotalRegular, t.currency))}
      {t.discount > 0 && row("Discounts", `−${money(t.discount, t.currency)}`)}
      {t.discount > 0 && row("Subtotal", money(t.subtotal, t.currency))}
      {row("Shipping", shipping === "later" ? "Calculated at checkout" : t.shipping === 0 ? "Free" : money(t.shipping, t.currency))}
      {row(shipping === "later" ? "Estimated total" : "Total", money(shipping === "later" ? t.subtotal : t.total, t.currency), true)}
      <p className="pt-1 text-xs text-mute">Taxes are not calculated.</p>
    </dl>
  );
}

export function CheckStatus({ loading, error, retry }: { loading: boolean; error: string | null; retry: () => void }) {
  if (error) return <p role="alert" className="rounded-sm border border-danger p-3 text-sm text-danger">{error} <button type="button" onClick={retry} className="underline">Try again</button></p>;
  return loading ? <Spinner label="Checking stock and prices" /> : null;
}
