"use client";
import Link from "next/link";
import { FavoriteButton } from "@/components/product/FavoriteButton";
import { formatMoney } from "@/lib/money";
import type { LiteItem } from "@/server/style/lite";

/** One recommended product: real price and availability, a match score and the reason, written from the product record and the shopper's answers. */
export function RecCard({ item, showMatch = true }: { item: LiteItem; showMatch?: boolean }) {
  return (
    <article className="flex w-full flex-col overflow-hidden rounded-md border border-line bg-surface" data-testid="rec-card" data-id={item.id}>
      <div className="relative">
        <Link href={`/product/${item.slug}`} className="block aspect-[4/5] bg-paper" aria-label={`${item.name}, ${item.brandName}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {item.image && <img src={item.image} alt="" loading="lazy" className="size-full object-cover" />}
        </Link>
        <FavoriteButton productId={item.id} name={item.name} className="absolute right-2 top-2" />
        {item.isNew && <span className="absolute left-2 top-2 rounded-sm bg-accent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-ink">New</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="truncate text-xs uppercase tracking-wider text-mute">{item.brandName} · {item.categoryName}</p>
        <Link href={`/product/${item.slug}`} className="line-clamp-2 text-sm font-medium leading-snug hover:underline">{item.name}</Link>
        <p className="text-sm">{item.price ? <>{item.compareAt && <s className="mr-1 text-mute">{formatMoney(item.compareAt)}</s>}{formatMoney(item.price)}</> : "Price not listed"}
          <span className="ml-2 text-xs font-medium text-ok">In stock</span>{item.demo && <span className="ml-2 text-xs text-mute">Demo</span>}</p>
        <p className="mt-1 text-xs leading-relaxed text-mute" data-testid="rec-why">{item.explanation}</p>
        {showMatch && <p className="mt-auto pt-2 text-[11px] uppercase tracking-wider text-mute">Match {item.match}%</p>}
      </div>
    </article>
  );
}
