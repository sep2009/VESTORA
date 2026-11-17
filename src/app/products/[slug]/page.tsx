import { notFound } from "next/navigation";
import { getProductBySlug } from "@/server/catalog/repository";
import { CatalogNotice } from "@/components/ui/CatalogNotice";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  if (result.status !== "ok") return <CatalogNotice status={result.status} message={result.status === "error" ? result.message : undefined} />;
  if (!result.data) notFound();
  const p = result.data;
  return (
    <article className="space-y-2">
      <h1 className="text-3xl font-semibold">{p.name}</h1>
      <p className="text-neutral-400">{p.description}</p>
    </article>
  );
}
