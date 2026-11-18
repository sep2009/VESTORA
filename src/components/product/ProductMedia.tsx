"use client";
import { useState } from "react";
import type { Product } from "@/modules/catalog/types";
import { isDemo } from "@/modules/catalog/types";
import { cn } from "@/lib/cn";
import { ProductGallery } from "@/components/shop/ProductGallery";
import dynamic from "next/dynamic";

// three.js and the loaders are only downloaded for products that actually have a model.
const ProductViewer = dynamic(() => import("./viewer/ProductViewer").then((m) => m.ProductViewer), { ssr: false, loading: () => <div className="aspect-[4/5] max-h-[78svh] w-full rounded-sm bg-ink/6" aria-hidden="true" /> });

/**
 * The product's visual: the interactive 3D viewer when the record has a real GLB/GLTF, and photographs otherwise.
 * A photograph is never presented as a 3D model; when there is no model (or it fails to load) the page says so.
 */
export function ProductMedia({ product, color }: { product: Product; color: string | null }) {
  const model = product.model3d;
  const [tab, setTab] = useState<"3d" | "photos">(model ? "3d" : "photos");
  const [failed, setFailed] = useState<string | null>(null);
  const has3d = !!model && !failed;
  const tabBtn = (id: "3d" | "photos", label: string) => (
    <button type="button" role="tab" id={`pm-tab-${id}`} aria-selected={tab === id} aria-controls={`pm-panel-${id}`} onClick={() => setTab(id)}
      className={cn("min-h-11 border-b-2 px-4 text-xs uppercase tracking-[0.16em] sm:min-h-9", tab === id ? "border-ink text-ink" : "border-transparent text-mute hover:text-ink")}>{label}</button>
  );
  return (
    <div className="space-y-3">
      {has3d && <div role="tablist" aria-label="Product views" className="flex gap-1 border-b border-line">{tabBtn("3d", "3D view")}{tabBtn("photos", `Photos (${product.images.length})`)}</div>}
      {model && (
        // Kept mounted (hidden) so switching tabs does not reload or re-create the model.
        <div id="pm-panel-3d" role="tabpanel" aria-labelledby="pm-tab-3d" hidden={tab !== "3d" || !has3d}>
          <ProductViewer url={model.url} name={product.name} license={model.license} onUnavailable={(r) => { setFailed(r); setTab("photos"); }} />
        </div>
      )}
      {(tab === "photos" || !has3d) && (
        <div id="pm-panel-photos" role={has3d ? "tabpanel" : undefined} aria-labelledby={has3d ? "pm-tab-photos" : undefined}>
          <ProductGallery images={product.images} name={product.name} demo={isDemo(product)} color={color} />
          <p className="mt-2 text-xs text-mute" data-testid="no-3d-note">
            {failed ? `3D view unavailable: ${failed} Showing photographs instead.` : "There is no 3D model for this product yet. These are photographs."}
          </p>
        </div>
      )}
    </div>
  );
}
