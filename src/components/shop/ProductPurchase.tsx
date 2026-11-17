"use client";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/modules/catalog/types";
import { isDemo, isPurchasable } from "@/modules/catalog/types";
import { Button } from "@/components/ui/Button";
import { FavoriteButton } from "@/components/product/FavoriteButton";
import { AvailabilityLabel, Label } from "@/components/product/ProductLabel";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import { useCart } from "@/stores/cart-store";
import { useToasts } from "@/stores/toast-store";

/** Size/colour choice, add to cart, favorite, mall link and the product's source. Only data present in the record is offered. */
export function ProductPurchase({ product, brandName, inMall }: { product: Product; brandName: string; inMall: boolean }) {
  const sizes = product.sizes?.verified ? product.sizes.values : [];
  const colors = product.colorsVerified ? product.colors : [];
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0]!.name : null);
  const [error, setError] = useState<string | null>(null);
  const add = useCart((s) => s.add);
  const push = useToasts((s) => s.push);
  const demo = isDemo(product);
  const soldOut = product.availability === "out_of_stock";

  const addToCart = () => {
    if (sizes.length > 0 && !size) return setError("Choose a size first.");
    if (colors.length > 1 && !color) return setError("Choose a color first.");
    setError(null);
    add({ productId: product.id, slug: product.slug, name: product.name, brandName, image: product.images[0]?.url ?? null, size, color, unitPrice: product.price, source: { kind: product.source.kind, retailer: product.source.retailer, url: product.source.url } });
    push(`Added ${product.name}${size ? ` (${size})` : ""} to your cart`, "success");
  };
  const chip = (active: boolean) => cn("min-h-11 min-w-11 rounded-sm border px-3 text-sm", active ? "border-ink bg-ink text-paper" : "border-line hover:border-ink");
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href={`/shop?brand=${product.brand}`} className="text-xs uppercase tracking-[0.2em] text-mute hover:text-ink">{brandName}</Link>
        <h1 className="font-display text-headline">{product.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xl">{product.price ? formatMoney(product.price) : "Price unavailable"}</p>
          {demo && <Label kind="ink">Demo product</Label>}<AvailabilityLabel availability={product.availability} />
        </div>
      </div>
      <p className="max-w-prose leading-relaxed text-mute">{product.description}</p>

      {colors.length > 0 && (
        <fieldset><legend className="mb-2 text-xs uppercase tracking-[0.2em] text-mute">Color{color ? `: ${color}` : ""}</legend>
          <div className="flex flex-wrap gap-2">{colors.map((c) => (
            <button key={c.name} type="button" aria-pressed={color === c.name} onClick={() => setColor(c.name)} className={cn(chip(color === c.name), "inline-flex items-center gap-2")}>
              {c.hex && <span aria-hidden="true" className="size-4 rounded-full border border-line" style={{ background: c.hex }} />}{c.name}
            </button>))}</div>
        </fieldset>
      )}
      {sizes.length > 0 && (
        <fieldset><legend className="mb-2 text-xs uppercase tracking-[0.2em] text-mute">Size{size ? `: ${size}` : ""}</legend>
          <div className="flex flex-wrap gap-2">{sizes.map((s) => <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)} className={chip(size === s)}>{s}</button>)}</div>
        </fieldset>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={addToCart} disabled={soldOut}>{soldOut ? "Sold out" : demo ? "Add demo item to cart" : "Add to cart"}</Button>
        <FavoriteButton productId={product.id} name={product.name} className="border border-line" />
        {inMall && <Button href={`/?p=${product.slug}`} variant="secondary" size="lg">Show in 3D mall</Button>}
      </div>

      <section aria-label="Product source" className="rounded-md border border-line bg-surface p-4 text-sm">
        <h2 className="mb-1 text-xs uppercase tracking-[0.2em] text-mute">Source</h2>
        {demo ? (
          <p>Demo data for testing this store. It is not a real item and has no real source, price or photograph.</p>
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
