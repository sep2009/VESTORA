import type { Product } from "@/domain";
import { formatMoney } from "@/lib/money";
import { priceRange, stockLevel } from "@/lib/product-info";
import { StockLabel } from "./ProductLabel";

export function ProductInfoPanel({ product }: { product: Product }) {
  const range = priceRange(product);
  const sizes = [...new Map(product.variants.map((v) => [v.size.code, v.size])).values()];
  const colors = [...new Map(product.variants.map((v) => [v.color.code, v.color])).values()];
  return (
    <section aria-label="Product information" className="space-y-6">
      <div className="space-y-2"><StockLabel level={stockLevel(product)} />
        <h1 className="font-display text-headline">{product.name}</h1>
        {range && <p className="text-lg">{formatMoney(range.min)}{range.min.amount !== range.max.amount && ` – ${formatMoney(range.max)}`}</p>}
      </div>
      {product.description && <p className="max-w-prose leading-relaxed text-mute">{product.description}</p>}
      {colors.length > 0 && (
        <div><h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-mute">Colors</h2>
          <ul className="flex flex-wrap gap-2">{colors.map((c) => (
            <li key={c.code} className="flex items-center gap-2 rounded-sm border border-line px-3 py-1.5 text-sm">
              <span aria-hidden="true" className="size-3.5 rounded-full border border-line" style={{ backgroundColor: c.hex }} />{c.label}
            </li>))}</ul></div>
      )}
      {sizes.length > 0 && (
        <div><h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-mute">Sizes</h2>
          <ul className="flex flex-wrap gap-2">{sizes.map((s) => <li key={s.code} className="rounded-sm border border-line px-3 py-1.5 text-sm">{s.label}</li>)}</ul></div>
      )}
    </section>
  );
}
