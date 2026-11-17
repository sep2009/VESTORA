import Link from "next/link";
import type { Product } from "@/domain";
import { formatMoney } from "@/lib/money";
import { priceRange, stockLevel } from "@/lib/product-info";
import { FavoriteButton } from "./FavoriteButton";
import { StockLabel } from "./ProductLabel";

export function ProductCard({ product }: { product: Product }) {
  const range = priceRange(product);
  const image = product.assets.images[0];
  return (
    <article className="group relative">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-ink/6">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={product.name} loading="lazy" className="size-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.03] motion-reduce:transition-none" />
          ) : (
            <div className="grid size-full place-items-center text-xs uppercase tracking-[0.2em] text-mute">Image coming soon</div>
          )}
          <div className="absolute top-3 left-3"><StockLabel level={stockLevel(product)} /></div>
        </div>
        <h3 className="mt-3 text-sm font-medium">{product.name}</h3>
        {range && (
          <p className="text-sm text-mute">
            {range.min.amount === range.max.amount ? formatMoney(range.min) : `${formatMoney(range.min)} – ${formatMoney(range.max)}`}
          </p>
        )}
      </Link>
      <div className="absolute top-3 right-3"><FavoriteButton productId={product.id} name={product.name} /></div>
    </article>
  );
}
