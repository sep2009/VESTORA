import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { matchScore } from "@/modules/catalog/query";
import { effectivePrice, resolveStock } from "@/modules/catalog/types";
import { requireAdminPage } from "@/server/auth/page-guard";
import { getCatalog } from "@/server/catalog/catalog";

export const metadata: Metadata = { title: "Products", robots: { index: false } };
export const dynamic = "force-dynamic";
const PAGE = 25;

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; dept?: string }> }) {
  const { role } = await requireAdminPage();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "", page = Math.max(1, Number(sp.page) || 1);
  const c = (await getCatalog());
  const brand = new Map(c.brands.map((b) => [b.slug, b.name]));
  const all = c.products.filter((p) => (!sp.dept || p.department === sp.dept) && matchScore(p, brand.get(p.brand) ?? "", q) > 0).sort((a, b) => a.name.localeCompare(b.name));
  const rows = all.slice((page - 1) * PAGE, page * PAGE), pages = Math.max(1, Math.ceil(all.length / PAGE));
  const href = (n: number) => `/admin/products?${new URLSearchParams({ ...(q ? { q } : {}), ...(sp.dept ? { dept: sp.dept } : {}), page: String(n) })}`;
  return (
    <AdminShell role={role} title="Products" intro={`${all.length} of ${c.products.length} products`}>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form method="get" role="search" className="flex gap-2"><label className="sr-only" htmlFor="aq">Search products</label><input id="aq" name="q" defaultValue={q} placeholder="Search name, brand, category" className="h-10 w-64 rounded-sm border border-line bg-surface px-3 text-sm" /><Button type="submit" size="sm">Search</Button></form>
        <Button href="/admin/products/new" size="sm" variant="secondary">New product</Button>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="border-b border-line text-left text-xs uppercase tracking-[0.14em] text-mute"><th className="py-2">Product</th><th>Department</th><th>Category</th><th>Price</th><th>Stock</th><th>Flags</th></tr></thead>
        <tbody>{rows.map((p) => { const r = resolveStock(p), price = effectivePrice(p); return (
          <tr key={p.id} className="border-b border-line align-top">
            <td className="py-2"><Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link><div className="text-xs text-mute">{brand.get(p.brand)} · <code>{p.id}</code></div></td>
            <td>{p.department}</td><td>{c.categories.find((x) => x.slug === p.category)?.name ?? p.category}</td>
            <td>{price ? formatMoney(price) : "—"}{p.salePrice && <span className="ml-1 text-xs text-accent-ink">sale</span>}</td>
            <td>{r.stock ?? "—"}{r.availability === "out_of_stock" && <span className="ml-1 text-xs text-danger">out</span>}</td>
            <td className="text-xs text-mute">{[p.featured && "featured", !p.showInMall && "hidden in mall", p.source.kind === "demo" && "demo"].filter(Boolean).join(" · ")}</td>
          </tr>); })}</tbody></table></div>
      {pages > 1 && <nav aria-label="Pages" className="mt-6 flex items-center gap-3 text-sm">{page > 1 && <Link href={href(page - 1)} className="rounded-sm border border-line px-3 py-1.5">← Previous</Link>}<span className="text-mute">Page {page} of {pages}</span>{page < pages && <Link href={href(page + 1)} className="rounded-sm border border-line px-3 py-1.5">Next →</Link>}</nav>}
    </AdminShell>
  );
}
