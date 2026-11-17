import type { Metadata } from "next";
import { listDepartments, listProducts } from "@/server/catalog/repository";
import { CatalogNotice } from "@/components/ui/CatalogNotice";
import { EmptyState } from "@/components/feedback/States";
import { PageShell } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductFilters, type FilterGroup } from "@/components/product/ProductFilters";
import { Button } from "@/components/ui/Button";
import { stockLevel } from "@/lib/product-info";

export const metadata: Metadata = { title: "Shop" };
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const list = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export default async function ShopPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = list(sp.q)[0]?.trim() ?? "";
  const depts = list(sp.dept), sizes = list(sp.size), colors = list(sp.color);
  const inStock = list(sp.instock)[0] === "1";

  const [products, departments] = await Promise.all([listProducts(), listDepartments()]);
  if (products.status !== "ok") return <PageShell eyebrow="Shop" title="All pieces"><CatalogNotice status={products.status} message={products.status === "error" ? products.message : undefined} /></PageShell>;

  const deptList = departments.status === "ok" ? departments.data : [];
  const all = products.data;
  const uniq = <T extends { code: string; label: string }>(xs: T[]) => [...new Map(xs.map((x) => [x.code, x])).values()];
  const groups: FilterGroup[] = [
    { name: "dept", legend: "Department", options: deptList.map((d) => ({ value: d.slug, label: d.name })), selected: depts },
    { name: "size", legend: "Size", options: uniq(all.flatMap((p) => p.variants.map((v) => v.size))).map((s) => ({ value: s.code, label: s.label })), selected: sizes },
    { name: "color", legend: "Color", options: uniq(all.flatMap((p) => p.variants.map((v) => v.color))).map((c) => ({ value: c.code, label: c.label })), selected: colors },
  ];
  const deptIds = deptList.filter((d) => depts.includes(d.slug)).map((d) => d.id);
  const shown = all.filter((p) =>
    (!q || p.name.toLowerCase().includes(q.toLowerCase())) &&
    (depts.length === 0 || deptIds.includes(p.departmentId)) &&
    (sizes.length === 0 || p.variants.some((v) => sizes.includes(v.size.code))) &&
    (colors.length === 0 || p.variants.some((v) => colors.includes(v.color.code))) &&
    (!inStock || stockLevel(p) !== "out"));

  return (
    <PageShell eyebrow="Shop" title={q ? `Results for “${q}”` : "All pieces"} intro={all.length ? `${shown.length} of ${all.length} pieces` : undefined}>
      {all.length === 0 ? <CatalogNotice status="empty" /> : (
        <div className="grid gap-10 lg:grid-cols-[14rem_1fr]">
          <aside><ProductFilters groups={groups} q={q} inStock={inStock} /></aside>
          {shown.length === 0 ? (
            <EmptyState title="No matches" action={<Button href="/shop" variant="secondary">Clear filters</Button>}>No pieces match these filters.</EmptyState>
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
              {shown.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
            </ul>
          )}
        </div>
      )}
    </PageShell>
  );
}
