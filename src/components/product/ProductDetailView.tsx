"use client";
import { useState } from "react";
import type { ProductDetail } from "@/server/catalog/detail";
import { isDemo } from "@/modules/catalog/types";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductMedia } from "@/components/product/ProductMedia";
import { ProductPurchase } from "@/components/shop/ProductPurchase";
import { ViewTracker } from "@/components/style/ViewTracker";
import { useDetailSheet } from "@/stores/detail-sheet";

const GROUPS = [
  { key: "similar", title: "Similar products" },
  { key: "matching", title: "Pairs well with" },
  { key: "accessories", title: "Complete the look" },
  { key: "department", title: "" },
] as const;

/**
 * One product experience used by the product page and by the 3D mall's sheet. The viewer is visually dominant;
 * the info panel carries the choices. Recommendations are real catalog records.
 */
export function ProductDetailView({ data, variant, onShowInMall }: { data: ProductDetail; variant: "page" | "sheet"; onShowInMall?: () => void }) {
  const { product: p, brandName, collectionNames, inMall, recommendations, departmentName } = data;
  const [color, setColor] = useState<string | null>(null);
  const openInSheet = useDetailSheet((s) => s.open);
  // In the sheet, a recommended product opens in the same sheet so the mall behind it keeps its state.
  const intercept = variant === "sheet" ? (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a[href^='/product/']");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    openInSheet(a.getAttribute("href")!.replace("/product/", ""));
  } : undefined;
  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12">
        <div className="lg:sticky lg:top-24 lg:self-start"><ProductMedia key={p.id} product={p} color={color} /></div>
        <ViewTracker productId={p.id} />
        <ProductPurchase key={p.id} product={p} brandName={brandName} inMall={inMall} collectionNames={collectionNames} onColorChange={setColor} heading={variant === "sheet" ? "h2" : "h1"} onShowInMall={onShowInMall} />
      </div>
      <div onClickCapture={intercept}>
        {GROUPS.map((g) => {
          const items = recommendations[g.key];
          if (items.length === 0) return null;
          const title = g.title || `More in ${departmentName}`;
          return (
            <section key={g.key} aria-label={title} className="mt-14">
              <h3 className="mb-5 font-display text-2xl">{title}</h3>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">{items.map((it) => <li key={it.id}><ProductCard item={it} /></li>)}</ul>
            </section>
          );
        })}
      </div>
      {isDemo(p) && <p className="mt-10 text-xs text-mute">Everything on this page is demo data for testing the store.</p>}
    </div>
  );
}
