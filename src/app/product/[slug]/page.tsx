import { notFound } from "next/navigation";
import { getProductBySlug } from "@/server/catalog/repository";
import { CatalogNotice } from "@/components/ui/CatalogNotice";
import { Container } from "@/components/layout/PageShell";
import { ProductInfoPanel } from "@/components/product/ProductInfoPanel";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  if (result.status !== "ok") return <Container className="py-16"><CatalogNotice status={result.status} message={result.status === "error" ? result.message : undefined} /></Container>;
  if (!result.data) notFound();
  const p = result.data;
  const image = p.assets.images[0];
  return (
    <Container className="grid gap-10 py-10 sm:py-16 lg:grid-cols-2">
      <div className="aspect-[3/4] overflow-hidden rounded-sm bg-ink/6">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={p.name} className="size-full object-cover" />
        ) : <div className="grid size-full place-items-center text-xs uppercase tracking-[0.2em] text-mute">Image coming soon</div>}
      </div>
      <ProductInfoPanel product={p} />
    </Container>
  );
}
