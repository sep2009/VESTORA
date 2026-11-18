import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { requireAdminPage } from "@/server/auth/page-guard";
import { getCatalog } from "@/server/catalog/catalog";

export const metadata: Metadata = { title: "Edit product", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireAdminPage();
  const { id } = await params;
  const c = getCatalog();
  const initial = id === "new" ? null : c.products.find((p) => p.id === id) ?? null;
  if (id !== "new" && !initial) notFound();
  return (
    <AdminShell role={role} title={initial ? initial.name : "New product"}>
      <ProductEditor key={initial?.id ?? "new"} initial={initial} brands={c.brands} categories={c.categories} collections={c.collections} departments={c.departments} role={role} />
    </AdminShell>
  );
}
