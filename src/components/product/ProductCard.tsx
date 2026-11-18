import Link from "next/link";
import type { IndexItem } from "@/server/catalog/index-data";
import { formatMoney } from "@/lib/money";
import { FavoriteButton } from "./FavoriteButton";
import { AvailabilityLabel, Label } from "./ProductLabel";

/** Catalog card. Used by the shop, favorites and the mobile rail: always the same record, same id. */
export function ProductCard({ item, showMallLink = true }: { item: IndexItem; showMallLink?: boolean }) {
  return (
    <article className="group relative">
      <Link href={`/product/${item.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-ink/6">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={`${item.name}${item.demo ? " (demo illustration)" : ""}`} loading="lazy" className="size-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.03] motion-reduce:transition-none" />
          ) : <div className="grid size-full place-items-center text-xs uppercase tracking-[0.2em] text-mute">No image</div>}
          <div className="absolute top-3 left-3 flex flex-col items-start gap-1">{item.demo && <Label kind="ink">Demo</Label>}{item.compareAt && <Label kind="accent">Sale</Label>}<AvailabilityLabel availability={item.availability} /></div>
        </div>
        <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-mute">{item.brandName}</p>
        <h3 className="text-sm font-medium">{item.name}</h3>
        <p className="text-sm text-mute">{item.price ? formatMoney(item.price) : "Price unavailable"}{item.compareAt && <s className="ml-2 text-xs">{formatMoney(item.compareAt)}</s>}</p>
      </Link>
      <div className="absolute top-3 right-3"><FavoriteButton productId={item.id} name={item.name} /></div>
      {showMallLink && item.inMall && (
        <Link href={`/?p=${item.slug}`} className="mt-1 inline-block text-[11px] uppercase tracking-[0.14em] text-accent-ink hover:underline">Show in 3D mall</Link>
      )}
    </article>
  );
}
