import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductPurchase } from "@/components/shop/ProductPurchase";
import { CATEGORY_LABEL, DEPARTMENT_LABEL } from "@/modules/catalog/kinds";
import { isDemo } from "@/modules/catalog/types";
import { getCatalog, getProductBySlug } from "@/server/catalog/catalog";
import { getIndex } from "@/server/catalog/index-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getProductBySlug((await params).slug);
  return { title: p ? p.name : "Product not found" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProductBySlug(slug);
  if (!p) notFound();
  const { brands } = getCatalog();
  const brandName = brands.find((b) => b.slug === p.brand)?.name ?? p.brand;
  const index = getIndex();
  const me = index.items.find((i) => i.id === p.id)!;
  const related = index.items.filter((i) => i.department === p.department && i.id !== p.id).slice(0, 4);
  return (
    <Container className="py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs uppercase tracking-[0.14em] text-mute">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/shop" className="hover:text-ink">Shop</Link></li><li aria-hidden="true">/</li>
          <li><Link href={`/shop?dept=${p.department}`} className="hover:text-ink">{DEPARTMENT_LABEL[p.department]}</Link></li><li aria-hidden="true">/</li>
          <li><Link href={`/shop?category=${p.category}`} className="hover:text-ink">{CATEGORY_LABEL[p.category]}</Link></li><li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">{p.name}</li>
        </ol>
      </nav>
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={p.images} name={p.name} demo={isDemo(p)} />
        <ProductPurchase product={p} brandName={brandName} inMall={me.inMall} />
      </div>
      {related.length > 0 && (
        <section aria-label={`More in ${DEPARTMENT_LABEL[p.department]}`} className="mt-20">
          <h2 className="mb-6 font-display text-2xl">More in {DEPARTMENT_LABEL[p.department]}</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">{related.map((it) => <li key={it.id}><ProductCard item={it} /></li>)}</ul>
        </section>
      )}
    </Container>
  );
}
