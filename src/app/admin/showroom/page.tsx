import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { ShowroomEditor } from "@/components/admin/ShowroomEditor";
import { DEPARTMENTS } from "@/modules/catalog/types";
import { requireAdminPage } from "@/server/auth/page-guard";
import { getCatalog } from "@/server/catalog/catalog";
import { mallDisplays } from "@/server/catalog/index-data";

export const metadata: Metadata = { title: "Showroom editor", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminShowroom({ searchParams }: { searchParams: Promise<{ dept?: string }> }) {
  const { role } = await requireAdminPage();
  const sp = await searchParams;
  const dept = (DEPARTMENTS as readonly string[]).includes(sp.dept ?? "") ? sp.dept! : "luxury";
  const c = getCatalog();
  const placedAt = new Map(mallDisplays(c).displays.flatMap((d) => d.products.map((p) => [p.id, d.slot.id] as const)));
  const products = c.products.filter((p) => p.department === dept).map((p) => ({ id: p.id, name: p.name, category: p.category, showInMall: p.showInMall, placedAt: placedAt.get(p.id) ?? null, pin: c.pins[p.id] ?? null }));
  return (
    <AdminShell role={role} title="Showroom editor" intro="Fixtures and product placement are data. Changes appear in the 3D mall without editing any 3D code.">
      <ShowroomEditor key={dept} department={dept} slots={c.slots.filter((s) => s.department === dept)} products={products} departments={c.departments.map((d) => ({ slug: d.slug, name: d.name }))} role={role} />
    </AdminShell>
  );
}
