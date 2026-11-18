"use client";
import Link from "next/link";
import { useCart, totals, type CartLine } from "@/stores/cart-store";
import { formatMoney } from "@/lib/money";
import { Label } from "@/components/product/ProductLabel";

/** Price per currency; never adds different currencies together. */
export function Totals({ lines }: { lines: readonly CartLine[] }) {
  const t = totals(lines);
  const unpriced = lines.filter((l) => !l.unitPrice).length;
  return (
    <div className="space-y-1 text-sm">
      {t.map((x) => <p key={x.currency} className="flex justify-between"><span>Subtotal ({x.currency})</span><strong>{formatMoney(x)}</strong></p>)}
      {unpriced > 0 && <p className="text-mute">{unpriced} item(s) without a verified price are not included.</p>}
    </div>
  );
}

export function CartLines({ editable = true }: { editable?: boolean }) {
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  return (
    <ul className="divide-y divide-line border-y border-line">
      {lines.map((l) => (
        <li key={l.key} className="flex gap-4 py-5">
          <Link href={`/product/${l.slug}`} className="block h-28 w-24 shrink-0 overflow-hidden rounded-sm bg-ink/6">
            {l.image &&   <img src={l.image} alt="" className="size-full object-cover" />}
          </Link>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] uppercase tracking-[0.16em] text-mute">{l.brandName}</p>
            <Link href={`/product/${l.slug}`} className="block font-medium hover:underline">{l.name}</Link>
            <p className="text-sm text-mute">{[l.size && `Size ${l.size}`, l.color].filter(Boolean).join(" · ") || "No options"}</p>
            <div className="flex flex-wrap items-center gap-2">
              {l.source.kind === "demo" ? <Label kind="ink">Demo product</Label> : <span className="text-xs text-mute">Source: {l.source.retailer ?? l.source.kind}</span>}
            </div>
            {editable ? (
              <div className="flex items-center gap-3 pt-1">
                <div className="inline-flex items-center rounded-sm border border-line" role="group" aria-label={`Quantity for ${l.name}`}>
                  <button type="button" onClick={() => setQuantity(l.key, l.quantity - 1)} aria-label="Decrease quantity" className="grid size-10 place-items-center">−</button>
                  <span className="w-8 text-center text-sm" aria-live="polite">{l.quantity}</span>
                  <button type="button" onClick={() => setQuantity(l.key, l.quantity + 1)} aria-label="Increase quantity" className="grid size-10 place-items-center">+</button>
                </div>
                <button type="button" onClick={() => remove(l.key)} className="text-xs uppercase tracking-[0.14em] text-mute underline hover:text-ink">Remove</button>
              </div>
            ) : <p className="text-sm text-mute">Quantity {l.quantity}</p>}
          </div>
          <p className="text-sm">{l.unitPrice ? formatMoney({ amount: l.unitPrice.amount * l.quantity, currency: l.unitPrice.currency }) : "—"}</p>
        </li>
      ))}
    </ul>
  );
}
