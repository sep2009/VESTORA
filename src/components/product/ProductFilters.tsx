import { Button } from "@/components/ui/Button";

export type FilterOption = { value: string; label: string };
export type FilterGroup = { name: string; legend: string; options: FilterOption[]; selected: string[] };

/** Plain GET form: works without JavaScript and keeps filters in the URL (shareable, back-button safe). */
export function ProductFilters({ groups, q, inStock }: { groups: FilterGroup[]; q?: string; inStock: boolean }) {
  return (
    <form method="get" action="/shop" aria-label="Filter products" className="space-y-6">
      {q && <input type="hidden" name="q" value={q} />}
      {groups.filter((g) => g.options.length > 0).map((g) => (
        <fieldset key={g.name}>
          <legend className="mb-2 text-xs uppercase tracking-[0.2em] text-mute">{g.legend}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2 lg:flex-col">
            {g.options.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={g.name} value={o.value} defaultChecked={g.selected.includes(o.value)} className="size-4 accent-ink" />{o.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="instock" value="1" defaultChecked={inStock} className="size-4 accent-ink" />In stock only</label>
      <div className="flex gap-2"><Button type="submit" size="sm">Apply</Button><Button href="/shop" size="sm" variant="ghost">Reset</Button></div>
    </form>
  );
}
