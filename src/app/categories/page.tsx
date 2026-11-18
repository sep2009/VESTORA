import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { departmentLabel } from "@/modules/catalog/kinds";
import { getCatalog } from "@/server/catalog/catalog";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default function CategoriesPage() {
  const { products, categories } = getCatalog();
  const count = (key: "category" | "department") => { const m = new Map<string, number>(); products.forEach((p) => m.set(p[key], (m.get(p[key]) ?? 0) + 1)); return [...m]; };
  return (
    <PageShell eyebrow="Shop mode" title="Categories and departments">
      <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-mute">Departments (each is a section of the 3D mall)</h2>
      <ul className="mb-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {count("department").map(([d, n]) => (
          <li key={d} className="flex items-center justify-between rounded-md border border-line bg-surface p-4">
            <span><Link href={`/shop?dept=${d}`} className="font-display text-lg hover:text-accent-ink">{departmentLabel(d)}</Link><span className="ml-2 text-xs text-mute">{n}</span></span>
            <Link href={`/?dept=${d}`} className="text-xs uppercase tracking-[0.14em] underline">In 3D</Link>
          </li>
        ))}
      </ul>
      <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-mute">Categories</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {count("category").map(([c, n]) => <li key={c}><Link href={`/shop?category=${c}`} className="block rounded-md border border-line bg-surface p-4 hover:border-ink"><span className="font-display text-lg">{categories.find((x) => x.slug === c)?.name ?? c}</span><span className="ml-2 text-xs text-mute">{n}</span></Link></li>)}
      </ul>
    </PageShell>
  );
}
