"use client";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import { hexFor, purchaseIssue, variantStock, type Pick } from "@/modules/outfit/core";
import type { TryOnItem } from "@/server/catalog/tryon-items";
import { useCart } from "@/stores/cart-store";
import { useToasts } from "@/stores/toast-store";
import { defaultColor, planCart, withVariant } from "@/components/outfit/studio-lib";

/** The real catalog product behind every result, with its live price and availability, variant choice, a link to its page and add-to-cart. */
export function ProductBar({ item, pick, onPick }: { item: TryOnItem; pick: Pick; onPick: (p: Pick) => void }) {
  const add = useCart((s) => s.add), push = useToasts((s) => s.push);
  const issue = purchaseIssue(item, pick);
  const cur = pick.color ?? defaultColor(item);
  const addToCart = () => {
    const plan = planCart({ [item.slot!]: pick }, (id) => (id === item.id ? item : undefined));
    if (plan.skipped.length) return push(`${item.name}: ${plan.skipped[0]!.reason}`, "error");
    plan.lines.forEach((l) => add(l, 1)); push(`Added ${item.name}${pick.size ? ` (${pick.size})` : ""} to your cart`, "success");
  };
  return (
    <section aria-label="Product" className="rounded-md border border-line bg-surface p-4" data-testid="product-bar">
      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {item.image ? <img src={item.image} alt="" className="size-24 shrink-0 rounded-sm bg-paper object-cover" /> : <span className="size-24 shrink-0 rounded-sm bg-paper" />}
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-mute">{item.brandName} · {item.categoryName}</p>
          <p className="font-medium leading-snug">{item.name}</p>
          <p className="mt-1 text-sm">{item.price ? <>{item.compareAt && <s className="mr-2 text-mute">{formatMoney(item.compareAt)}</s>}{formatMoney(item.price)}</> : "Price not listed"}
            <span className={cn("ml-3 text-xs font-medium", item.available ? "text-ok" : "text-danger")}>{item.available ? "Available" : "Sold out"}</span></p>
          {item.demo && <p className="mt-1 text-xs text-mute">Demo product (test data, not a real item).</p>}
        </div>
      </div>
      {item.available && (item.colors.length > 0 || item.sizes.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          {item.colors.length > 0 && <div role="group" aria-label="Color" className="flex items-center gap-1.5">
            {item.colors.map((c) => { const out = variantStock(item, null, c.name) === 0, on = cur === c.name;
              return <button key={c.name} type="button" disabled={out} aria-pressed={on} aria-label={`${c.name}${out ? " (sold out)" : ""}`} title={c.name} onClick={() => onPick(withVariant(item, pick, { color: c.name }))}
                className={cn("size-8 rounded-full border-2", on ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-surface" : "border-surface ring-1 ring-line", out && "opacity-35")} style={{ background: hexFor(item, c.name) }} />; })}
            <span className="ml-1 text-xs text-mute">{cur}</span></div>}
          {item.sizes.length > 0 && <div className="flex items-center gap-2"><label htmlFor="tp-size" className="text-xs text-mute">Size</label>
            <select id="tp-size" value={pick.size ?? ""} onChange={(e) => onPick(withVariant(item, pick, { size: e.target.value || null }))} className="min-h-10 rounded-sm border border-line bg-paper px-2 text-sm">
              <option value="">Choose</option>{item.sizes.map((z) => { const n = variantStock(item, z, item.colors.length > 1 ? cur : null); return <option key={z} value={z} disabled={n === 0}>{z}{n === 0 ? " (sold out)" : ""}</option>; })}</select></div>}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-sm bg-ink px-5 text-sm font-medium uppercase tracking-[0.12em] text-paper disabled:opacity-40" onClick={addToCart} disabled={!item.available}>{item.available ? "Add product to cart" : "Sold out"}</button>
        <Link href={`/product/${item.slug}`} className="inline-flex min-h-11 items-center rounded-sm border border-ink px-5 text-sm font-medium uppercase tracking-[0.12em] hover:bg-ink hover:text-paper">Product details</Link>
      </div>
      {item.available && issue && <p className="mt-2 text-xs text-warn">To buy this: {issue}.</p>}
      <p className="mt-3 text-xs leading-relaxed text-mute">This preview does not tell you which size to buy or how the garment will fit. Use the product page’s size information. Price and availability are read from the catalog.</p>
    </section>
  );
}
