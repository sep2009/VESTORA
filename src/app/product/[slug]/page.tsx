import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/PageShell";
import { ProductDetailView } from "@/components/product/ProductDetailView";
import { getProductDetail } from "@/server/catalog/detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = (await getProductDetail((await params).slug));
  return { title: d ? d.product.name : "Product not found" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = (await getProductDetail((await params).slug));
  if (!d) notFound();
  const p = d.product;
  return (
    <Container className="py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs uppercase tracking-[0.14em] text-mute">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/shop" className="hover:text-ink">Shop</Link></li><li aria-hidden="true">/</li>
          <li><Link href={`/shop?dept=${p.department}`} className="hover:text-ink">{d.departmentName}</Link></li><li aria-hidden="true">/</li>
          <li><Link href={`/shop?category=${p.category}`} className="hover:text-ink">{d.categoryName}</Link></li><li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">{p.name}</li>
        </ol>
      </nav>
      <ProductDetailView data={d} variant="page" />
    </Container>
  );
}
