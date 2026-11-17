import { MallGate } from "@/components/showroom/MallGate";
import { MobileShopRail } from "@/components/shop/MobileShopRail";
import { Container } from "@/components/layout/PageShell";
import { toMallProduct } from "@/modules/showroom/assign";
import { getCatalog } from "@/server/catalog/catalog";
import { getIndex } from "@/server/catalog/index-data";

export const dynamic = "force-dynamic";

export default function ExplorePage() {
  const { products, brands } = getCatalog();
  const names = new Map(brands.map((b) => [b.slug, b.name]));
  const mall = products.map((p) => toMallProduct(p, names.get(p.brand) ?? p.brand));
  const featured = getIndex().items.filter((i) => i.availability === "in_stock").slice(0, 6);
  return (
    <>
      <Container className="pt-8 pb-6 sm:pt-16 sm:pb-8">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-accent-ink">Explore mode</p>
        <h1 className="max-w-4xl font-display text-headline sm:text-display">Walk the mall. <em className="not-italic text-accent-ink">Shop</em> what you find.</h1>
      </Container>
      <Container>
        <MobileShopRail items={featured} />
        <MallGate products={mall} />
      </Container>
    </>
  );
}
