import { Button } from "@/components/ui/Button";
import { departmentLabel } from "@/modules/catalog/kinds";
import type { Facets, Query } from "@/modules/catalog/query";

function Group({ legend, children }: { legend: string; children: React.ReactNode }) {
  return <fieldset className="border-t border-line pt-4"><legend className="mb-2 text-xs uppercase tracking-[0.2em] text-mute">{legend}</legend><div className="flex flex-col gap-2">{children}</div></fieldset>;
}
function Check({ name, value, label, checked, count }: { name: string; value: string; label: string; checked: boolean; count?: number }) {
  return (
    <label className="flex min-h-8 items-center gap-2 text-sm">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="size-4 accent-ink" />
      <span className="flex-1">{label}</span>{count !== undefined && <span className="text-xs text-mute">{count}</span>}
    </label>
  );
}
const AUDIENCE_LABEL: Record<string, string> = { men: "Men's", women: "Women's", unisex: "Unisex" };

/**
 * A plain GET form (works without JavaScript; the URL holds every filter so it survives switching modes).
 * It only renders filters that the catalog data actually supports: no verified sizes, no size filter.
 */
export function ShopFilters({ facets, query, collectionNames }: { facets: Facets; query: Query; collectionNames: Record<string, string> }) {
  const has = (arr: string[] | undefined, v: string) => !!arr?.includes(v);
  return (
    <form method="get" action="/shop" aria-label="Filter products" className="space-y-4">
      {query.q && <input type="hidden" name="q" value={query.q} />}
      <label className="block text-xs uppercase tracking-[0.2em] text-mute">Sort
        <select name="sort" defaultValue={query.sort ?? ""} className="mt-2 h-10 w-full rounded-sm border border-line bg-surface px-2 text-sm normal-case tracking-normal text-ink">
          <option value="">{query.q ? "Relevance" : "Name"}</option><option value="featured">Featured first</option><option value="price-asc">Price, low to high</option><option value="price-desc">Price, high to low</option><option value="name">Name</option>
        </select>
      </label>
      {facets.audiences.length > 1 && <Group legend="For">{facets.audiences.map((a) => <Check key={a.value} name="audience" value={a.value} label={AUDIENCE_LABEL[a.value] ?? a.value} count={a.count} checked={has(query.audience, a.value)} />)}</Group>}
      {facets.departments.length > 1 && <Group legend="Department">{facets.departments.map((d) => <Check key={d.value} name="dept" value={d.value} label={departmentLabel(d.value)} count={d.count} checked={has(query.department, d.value)} />)}</Group>}
      {facets.collections.length > 0 && <Group legend="Collection">{facets.collections.map((c) => <Check key={c.value} name="collection" value={c.value} label={collectionNames[c.value] ?? c.value} count={c.count} checked={has(query.collection, c.value)} />)}</Group>}
      {facets.brands.length > 1 && <Group legend="Brand">{facets.brands.map((b) => <Check key={b.slug} name="brand" value={b.slug} label={b.name} count={b.count} checked={has(query.brand, b.slug)} />)}</Group>}
      {facets.categories.length > 1 && <Group legend="Category">{facets.categories.map((c) => <Check key={c.value} name="category" value={c.value} label={c.label} count={c.count} checked={has(query.category, c.value)} />)}</Group>}
      {facets.price && (
        <Group legend={`Price (${facets.price.currency})`}>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="min">Minimum price</label><input id="min" name="min" type="number" min={0} placeholder={String(facets.price.min)} defaultValue={query.min} className="h-10 w-full rounded-sm border border-line bg-surface px-2 text-sm" />
            <span aria-hidden="true">–</span>
            <label className="sr-only" htmlFor="max">Maximum price</label><input id="max" name="max" type="number" min={0} placeholder={String(facets.price.max)} defaultValue={query.max} className="h-10 w-full rounded-sm border border-line bg-surface px-2 text-sm" />
          </div>
        </Group>
      )}
      {facets.sizes.length > 0 && <Group legend="Size"><div className="flex flex-wrap gap-x-4 gap-y-2">{facets.sizes.map((s) => <Check key={s} name="size" value={s} label={s} checked={has(query.size, s)} />)}</div></Group>}
      {facets.colors.length > 0 && <Group legend="Color"><div className="flex flex-wrap gap-x-4 gap-y-2">{facets.colors.map((c) => <Check key={c} name="color" value={c} label={c} checked={has(query.color, c)} />)}</div></Group>}
      {facets.anyUnavailable && <Group legend="Availability"><Check name="available" value="1" label="In stock only" checked={!!query.available} /></Group>}
      <div className="flex gap-2 pt-2"><Button type="submit" size="sm">Apply</Button><Button href={query.q ? `/shop?q=${encodeURIComponent(query.q)}` : "/shop"} size="sm" variant="ghost">Reset</Button></div>
    </form>
  );
}
