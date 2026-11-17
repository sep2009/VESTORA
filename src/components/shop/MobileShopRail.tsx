import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { DEPARTMENT_ZONES } from "@/modules/showroom/layout";
import type { IndexItem } from "@/server/catalog/index-data";

/** Phone home: search, departments and products first. The 3D mall is one tap away, never required. */
export function MobileShopRail({ items }: { items: IndexItem[] }) {
  return (
    <section aria-label="Shop" className="mb-8 space-y-6 md:hidden">
      <form action="/shop" method="get" role="search" className="flex gap-2">
        <label htmlFor="rail-search" className="sr-only">Search brands and products</label>
        <input id="rail-search" name="q" type="search" placeholder="Search brands and products" className="h-12 min-w-0 flex-1 rounded-sm border border-line bg-surface px-4" />
        <button type="submit" className="h-12 rounded-sm bg-ink px-5 text-xs font-medium uppercase tracking-[0.14em] text-paper">Search</button>
      </form>
      <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Departments">
        {DEPARTMENT_ZONES.map((z) => (
          <li key={z.id} className="shrink-0"><Link href={`/shop?dept=${z.department}`} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm">{z.name}</Link></li>
        ))}
      </ul>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-8">{items.map((it) => <li key={it.id}><ProductCard item={it} /></li>)}</ul>
      <Link href="/shop" className="block rounded-sm border border-ink py-3 text-center text-xs font-medium uppercase tracking-[0.14em]">See the whole catalog</Link>
    </section>
  );
}
