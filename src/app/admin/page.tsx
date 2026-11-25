import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { resolveStock } from "@/modules/catalog/types";
import { requireAdminPage } from "@/server/auth/page-guard";
import { getCatalog } from "@/server/catalog/catalog";
import { recentAudit } from "@/server/store/db";

export const metadata: Metadata = { title: "Admin dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const { role } = await requireAdminPage();
  const c = (await getCatalog());
  const demo = c.products.filter((p) => p.source.kind === "demo").length;
  const out = c.products.filter((p) => resolveStock(p).availability === "out_of_stock").length;
  const log = (await recentAudit(8)).map((e) => JSON.stringify(e));
  const stat = (label: string, value: number | string, href?: string) => (
    <li className="rounded-md border border-line bg-surface p-4"><p className="text-xs uppercase tracking-[0.16em] text-mute">{label}</p><p className="font-display text-3xl">{href ? <Link href={href} className="hover:text-accent-ink">{value}</Link> : value}</p></li>
  );
  return (
    <AdminShell role={role} title="Dashboard" intro="Everything shown in the shop and the 3D mall comes from this one database.">
      {demo > 0 && <p role="note" className="mb-8 rounded-md border border-line bg-surface p-3 text-sm text-mute"><strong className="text-ink">{demo} demo product(s).</strong> Demo records and their stock numbers are test data, not live inventory. Delete them when real products exist.</p>}
      <ul className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stat("Products", c.products.length, "/admin/products")}{stat("Out of stock", out)}{stat("Featured", c.products.filter((p) => p.featured).length)}{stat("On sale", c.products.filter((p) => p.salePrice).length)}
        {stat("Categories", c.categories.length, "/admin/taxonomy")}{stat("Collections", c.collections.length, "/admin/taxonomy")}{stat("Brands", c.brands.length, "/admin/taxonomy")}{stat("Mall fixtures", c.slots.length, "/admin/showroom")}
      </ul>
      {c.rejected.length > 0 && <p role="alert" className="mb-8 rounded-md border border-danger p-3 text-sm text-danger">{c.rejected.length} stored record(s) failed validation and are not shown: {c.rejected.slice(0, 3).map((r) => `${r.id} (${r.reasons[0]})`).join("; ")}</p>}
      <section aria-label="Recent changes"><h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-mute">Recent changes</h2>
        {log.length === 0 ? <p className="text-sm text-mute">No changes recorded yet.</p> : <ul className="space-y-1 font-mono text-xs">{log.map((l, i) => { try { const e = JSON.parse(l) as { at: string; actor: string; action: string }; return <li key={i}>{e.at.slice(0, 19).replace("T", " ")} · {e.actor} · {e.action}</li>; } catch { return null; } })}</ul>}
      </section>
    </AdminShell>
  );
}
