import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { TaxonomyManager } from "@/components/admin/TaxonomyManager";
import { requireAdminPage } from "@/server/auth/page-guard";
import { getCatalog } from "@/server/catalog/catalog";

export const metadata: Metadata = { title: "Taxonomy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminTaxonomy() {
  const { role } = await requireAdminPage();
  const c = (await getCatalog());
  return (
    <AdminShell role={role} title="Taxonomy" intro="Categories, collections, brands and department labels.">
      <TaxonomyManager categories={c.categories} collections={c.collections} brands={c.brands} departments={c.departments} role={role} />
    </AdminShell>
  );
}
