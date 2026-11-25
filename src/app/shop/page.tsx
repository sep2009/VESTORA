import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/feedback/States";
import { PageShell } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/product/ProductCard";
import { FilterDrawer } from "@/components/shop/FilterDrawer";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { Button } from "@/components/ui/Button";
import { departmentLabel } from "@/modules/catalog/kinds";
import { facets, parseQuery, queryProducts } from "@/modules/catalog/query";
import { getCatalog } from "@/server/catalog/catalog";
import { getIndex } from "@/server/catalog/index-data";

export const metadata: Metadata = { title: "Shop" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
type Params = Record<string, string | string[] | undefined>;

export default async function ShopPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const query = parseQuery(sp);
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);
  const { products, brands, categories, collections } = (await getCatalog());
  if (products.length === 0) {
    return <PageShell eyebrow="Shop mode" title="Shop"><EmptyState title="No products connected">The catalog is empty. Add verified product records to <code>data/catalog</code> or connect a product feed (see <code>data/catalog/README.md</code>).</EmptyState></PageShell>;
  }
  const f = facets(products, brands, categories);
  const found = queryProducts(products, brands, query);
  const index = new Map((await getIndex()).items.map((i) => [i.id, i]));
  const shown = found.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => index.get(p.id)!);
  const pages = Math.max(1, Math.ceil(found.length / PAGE_SIZE));
  const active = (query.audience?.length ?? 0) + (query.collection?.length ?? 0) + (query.brand?.length ?? 0) + (query.category?.length ?? 0) + (query.department?.length ?? 0) + (query.size?.length ?? 0) + (query.color?.length ?? 0) + (query.min !== undefined ? 1 : 0) + (query.max !== undefined ? 1 : 0) + (query.available ? 1 : 0);
  const brandName = new Map(brands.map((b) => [b.slug, b.name]));
  const chips = [
    ...(query.audience ?? []), ...(query.collection ?? []), ...(query.department ?? []).map((v) => departmentLabel(v)), ...(query.brand ?? []).map((v) => brandName.get(v) ?? v),
    ...(query.category ?? []).map((v) => categories.find((c) => c.slug === v)?.name ?? v), ...(query.size ?? []).map((v) => `Size ${v}`), ...(query.color ?? []),
  ];
  const hasDemo = products.some((p) => p.source.kind === "demo");
  const pageHref = (n: number) => { const u = new URLSearchParams(); Object.entries(sp).forEach(([k, v]) => { if (k !== "page") (Array.isArray(v) ? v : [v]).forEach((x) => x && u.append(k, x)); }); if (n > 1) u.set("page", String(n)); return `/shop${u.size ? `?${u}` : ""}`; };
  return (
    <PageShell eyebrow="Shop mode" title={query.q ? `Results for “${query.q}”` : "The catalog"} intro={`${found.length} of ${products.length} products${chips.length ? ` · ${chips.join(" · ")}` : ""}`}>
      {hasDemo && <p role="note" className="mb-8 rounded-md border border-line bg-surface p-3 text-sm text-mute"><strong className="text-ink">Demo catalog.</strong> These records are test data with fictional brands, so the whole store can be tried out. They are not real products and cannot be purchased.</p>}
      <div className="grid gap-10 lg:grid-cols-[15rem_1fr]">
        <aside aria-label="Filters"><FilterDrawer activeCount={active}><ShopFilters facets={f} query={query} collectionNames={Object.fromEntries(collections.map((c) => [c.slug, c.name]))} /></FilterDrawer></aside>
        <section aria-label="Products">
          {shown.length === 0 ? (
            <EmptyState title="No products match" action={<Button href="/shop" variant="secondary">Clear search and filters</Button>}>Try fewer filters or a different search term.</EmptyState>
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">{shown.map((it) => <li key={it.id}><ProductCard item={it} /></li>)}</ul>
          )}
          {pages > 1 && (
            <nav aria-label="Pages" className="mt-12 flex items-center justify-center gap-3 text-sm">
              {page > 1 && <Link href={pageHref(page - 1)} className="rounded-sm border border-line px-4 py-2">← Previous</Link>}
              <span className="text-mute">Page {page} of {pages}</span>
              {page < pages && <Link href={pageHref(page + 1)} className="rounded-sm border border-line px-4 py-2">Next →</Link>}
            </nav>
          )}
        </section>
      </div>
    </PageShell>
  );
}
