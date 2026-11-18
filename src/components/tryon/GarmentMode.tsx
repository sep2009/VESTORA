"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { TryOnItem } from "@/server/catalog/tryon-items";

const ProductViewer = dynamic(() => import("@/components/product/viewer/ProductViewer").then((m) => m.ProductViewer), { ssr: false, loading: () => <div className="grid h-[28rem] place-items-center rounded-md bg-paper text-sm text-mute" role="status">Loading 3D viewer…</div> });

/** Shows the product's OWN 3D model. It is not placed on a body or avatar, and a photo is never shown in its place. */
export function GarmentMode({ item, items, onSelect }: { item: TryOnItem | null; items: TryOnItem[]; onSelect: (id: string) => void }) {
  const [failed, setFailed] = useState<{ id: string; reason: string } | null>(null);
  const withModels = items.filter((i) => i.model);
  const unavailable = !item?.model || failed?.id === item.id;
  return (
    <div className="space-y-4">
      <div className="relative" data-testid="garment-stage">
        {!unavailable && item?.model ? (
          <>
            <ProductViewer key={item.id} url={item.model.url} name={item.name} license={item.model.license} onUnavailable={(reason) => setFailed({ id: item.id, reason })} />
            <span className="pointer-events-none absolute bottom-3 left-3 rounded-sm bg-ink/85 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-paper">3D garment preview</span>
          </>
        ) : (
          <div className="rounded-md border border-dashed border-line bg-surface p-6" role="status" data-testid="garment-unavailable">
            <p className="font-medium">{item ? (failed?.id === item.id ? "This product’s 3D model could not be shown." : "This product has no 3D model yet.") : "Choose a product."}</p>
            {item && failed?.id === item.id && <p className="mt-1 text-sm text-mute">{failed.reason}</p>}
            <p className="mt-2 text-sm leading-relaxed text-mute">3D garment preview needs a real 3D model (GLB or glTF) attached to the product. An administrator can upload one on the product’s page in the admin. No photo or avatar is shown here instead.</p>
            {withModels.length > 0 ? <div className="mt-3"><p className="text-xs uppercase tracking-wider text-mute">Products with a 3D model</p><ul className="mt-2 flex flex-wrap gap-2">{withModels.map((m) => <li key={m.id}><button className="min-h-10 rounded-full border border-line px-4 text-sm hover:border-ink" onClick={() => onSelect(m.id)}>{m.name}</button></li>)}</ul></div>
              : <p className="mt-3 text-sm text-mute">No product in the catalog has a 3D model yet.</p>}
          </div>
        )}
      </div>
      <p className="text-xs leading-relaxed text-mute">This is the product’s own 3D model. Turn it, zoom in and inspect the texture. It is not shown on a body and it does not show how the garment fits you.</p>
    </div>
  );
}
