"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/modules/catalog/types";
import { discountPercent, effectivePrice, isDemo, isPurchasable, resolveStock } from "@/modules/catalog/types";
import { Button } from "@/components/ui/Button";
import { FavoriteButton } from "@/components/product/FavoriteButton";
import { AvailabilityLabel, Label } from "@/components/product/ProductLabel";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import { useCart } from "@/stores/cart-store";
import { useToasts } from "@/stores/toast-store";

/** Size/colour choice from the real variants, add to cart, favorite, mall link and the product's source. Only data present in the record is offered. */
export function ProductPurchase({ product, brandName, inMall, collectionNames, onColorChange, heading = "h1", onShowInMall }: { product: Product; brandName: string; inMall: boolean; collectionNames: Record<string, string>; onColorChange?: (color: string | null) => void; heading?: "h1" | "h2"; onShowInMall?: () => void }) {
  const Heading = heading;
  const r = useMemo(() => resolveStock(product), [product]);
  const sizes = r.sizesVerified ? r.sizes : [];
  const colors = r.colorsVerified ? r.colors : [];
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0]!.name : null);
  useEffect(() => { if (colors.length === 1) onColorChange?.(colors[0]!.name); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const add = useCart((s) => s.add);
  const push = useToasts((s) => s.push);
  const demo = isDemo(product);
  const price = effectivePrice(product);
  const soldOut = r.availability === "out_of_stock";

  /** Stock of the chosen combination (or of the partial choice) when the product has variants. */
  const stockFor = (s: string | null, c: string | null) => product.variants.filter((v) => (s === null || v.size === s) && (c === null || v.color === c)).reduce((n, v) => n + v.stock, 0);
  const hasVariants = product.variants.length > 0;
  const chosen = hasVariants && (sizes.length === 0 || size) && (colors.length === 0 || color) ? product.variants.find((v) => (sizes.length === 0 || v.size === size) && (colors.length === 0 || v.color === color)) ?? null : null;

  const addToCart = () => {
    if (sizes.length > 0 && !size) return setError("Choose a size first.");
    if (colors.length > 1 && !color) return setError("Choose a color first.");
    if (hasVariants && (!chosen || chosen.stock < 1)) return setError("That combination is out of stock.");
    setError(null);
    add({ productId: product.id, slug: product.slug, name: product.name, brandName, image: product.images[0]?.url ?? null, sku: chosen?.sku ?? null, size, color, unitPrice: price, source: { kind: product.source.kind, retailer: product.source.retailer, url: product.source.url } }, qty);
    push(`Added ${qty > 1 ? `${qty} × ` : ""}${product.name}${size ? ` (${size})` : ""} to your cart`, "success");
  };
  const chip = (active: boolean, disabled = false) => cn("min-h-11 min-w-11 rounded-sm border px-3 text-sm", active ? "border-ink bg-ink text-paper" : "border-line hover:border-ink", disabled && "opacity-40 line-through");
  const maxQty = Math.max(1, Math.min(10, chosen ? chosen.stock : 10));
  const share = async () => {
    const url = `${window.location.origin}/product/${product.slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: product.name, url }); return; }
      await navigator.clipboard.writeText(url); push("Link copied", "success");
    } catch (e) { if ((e as Error).name !== "AbortError") push("Could not share. Copy the address from your browser instead.", "error"); }
  };
  const stockNote = chosen ? (demo ? `${chosen.stock} in demo stock (not live inventory)` : chosen.stock <= 5 ? `Only ${chosen.stock} left` : "In stock") : null;
  const pct = discountPercent(product);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href={`/shop?brand=${product.brand}`} className="text-xs uppercase tracking-[0.2em] text-mute hover:text-ink">{brandName}</Link>
        <Heading className="font-display text-headline">{product.name}</Heading>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xl">{price ? formatMoney(price) : "Price unavailable"}{product.salePrice && product.price && <s className="ml-2 text-base text-mute">{formatMoney(product.price)}</s>}</p>
          {pct > 0 && <Label kind="accent">{`${pct}% off`}</Label>}
          {demo && <Label kind="ink">Demo product</Label>}<AvailabilityLabel availability={r.availability} />
        </div>
      </div>
      <p className="max-w-prose leading-relaxed text-mute">{product.description}</p>
      <dl className="grid max-w-prose grid-cols-[7rem_1fr] gap-y-1 text-sm">
        {product.materials.length > 0 && <><dt className="text-mute">Material</dt><dd>{product.materials.join(", ")}</dd></>}
        {product.collections.length > 0 && <><dt className="text-mute">Collections</dt><dd>{product.collections.map((c) => <Link key={c} href={`/shop?collection=${c}`} className="mr-3 underline">{collectionNames[c] ?? c}</Link>)}</dd></>}
        <dt className="text-mute">For</dt><dd>{product.audience === "men" ? "Men" : product.audience === "women" ? "Women" : "Everyone"}</dd>
      </dl>

      {colors.length > 0 && (
        <fieldset><legend className="mb-2 text-xs uppercase tracking-[0.2em] text-mute">Color{color ? `: ${color}` : ""}</legend>
          <div className="flex flex-wrap gap-2">{colors.map((c) => (
            <button key={c.name} type="button" aria-pressed={color === c.name} disabled={hasVariants && stockFor(size, c.name) === 0} onClick={() => { setColor(c.name); onColorChange?.(c.name); if (size && hasVariants && stockFor(size, c.name) === 0) setSize(null); setQty(1); }} className={cn(chip(color === c.name, hasVariants && stockFor(size, c.name) === 0), "inline-flex items-center gap-2")}>
              {c.hex && <span aria-hidden="true" className="size-4 rounded-full border border-line" style={{ background: c.hex }} />}{c.name}
            </button>))}</div>
        </fieldset>
      )}
      {sizes.length > 0 && (
        <fieldset><legend className="mb-2 text-xs uppercase tracking-[0.2em] text-mute">Size{size ? `: ${size}` : ""}</legend>
          <div className="flex flex-wrap gap-2">{sizes.map((s) => { const out = hasVariants && stockFor(s, color) === 0; return <button key={s} type="button" aria-pressed={size === s} disabled={out} onClick={() => { setSize(s); setQty(1); }} className={chip(size === s, out)}>{s}</button>; })}</div>
        </fieldset>
      )}
      {stockNote && <p className="text-sm text-mute" aria-live="polite">{stockNote}{chosen?.sku ? ` · SKU ${chosen.sku}` : ""}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {!soldOut && (
        <div className="flex items-center gap-3"><span className="text-xs uppercase tracking-[0.2em] text-mute" id="qty-label">Quantity</span>
          <div role="group" aria-labelledby="qty-label" className="inline-flex items-center rounded-sm border border-line">
            <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-11 place-items-center disabled:opacity-40">−</button>
            <output aria-live="polite" className="w-8 text-center text-sm">{qty}</output>
            <button type="button" aria-label="Increase quantity" disabled={qty >= maxQty} onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="grid size-11 place-items-center disabled:opacity-40">+</button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={addToCart} disabled={soldOut}>{soldOut ? "Sold out" : demo ? "Add demo item to cart" : "Add to cart"}</Button>
        <FavoriteButton productId={product.id} name={product.name} className="border border-line" />
        <Button size="lg" variant="secondary" onClick={() => void share()}>Share</Button>
        {inMall && (onShowInMall ? <Button size="lg" variant="secondary" onClick={onShowInMall}>Back to the 3D mall</Button> : <Button href={`/?p=${product.slug}`} variant="secondary" size="lg">Show in 3D mall</Button>)}
      </div>

      {product.shipping && (
        <section aria-label="Shipping and returns" className="rounded-md border border-line p-4 text-sm">
          <h2 className="mb-1 text-xs uppercase tracking-[0.2em] text-mute">Shipping and returns</h2>
          <p>{product.shipping.summary}</p>{product.shipping.returns && <p className="mt-1 text-mute">{product.shipping.returns}</p>}
        </section>
      )}
      <section aria-label="Product source" className="rounded-md border border-line bg-surface p-4 text-sm">
        <h2 className="mb-1 text-xs uppercase tracking-[0.2em] text-mute">Source</h2>
        {demo ? (
          <p>Demo data for testing this store. It is not a real item and has no real source, price, photograph or stock level.</p>
        ) : (
          <p>
            {product.source.kind === "official" ? "Official brand page" : product.source.kind === "affiliate-feed" ? "Authorised retailer feed" : "Manually verified"}
            {product.source.retailer ? ` · ${product.source.retailer}` : ""}{product.source.retrievedAt ? ` · checked ${product.source.retrievedAt}` : ""}
          </p>
        )}
        {!demo && product.source.url && (
          <a href={product.source.url} target="_blank" rel="noopener noreferrer nofollow sponsored" className="mt-2 inline-block text-xs uppercase tracking-[0.16em] text-accent-ink underline">
            {isPurchasable(product) ? `Buy at ${product.source.retailer ?? "the retailer"} ↗` : `View at ${product.source.retailer ?? "the source"} ↗`}
          </a>
        )}
      </section>
    </div>
  );
}
