"use client";
import Link from "next/link";
import type { ResolvedDisplay } from "@/modules/showroom/types";
import { getZone } from "@/modules/showroom/layout";
import { cameraManager } from "@/modules/showroom/camera/manager";
import { selectFocusedProductId, useCameraStore } from "@/stores/camera-store";
import { Label } from "@/components/product/ProductLabel";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { useDetailSheet } from "@/stores/detail-sheet";

/** Product panel for the product focused in the mall. It is the SAME catalog record the shop shows; "Open in shop" opens that exact product. */
export function DisplayInfo({ displays }: { displays: readonly ResolvedDisplay[] }) {
  const id = useCameraStore(selectFocusedProductId);
  const depth = useCameraStore((s) => s.backDepth);
  const hit = id ? displays.find((d) => d.products.some((p) => p.id === id)) : undefined;
  const p = hit?.products.find((x) => x.id === id);
  if (!hit || !p) return null;
  const zone = getZone(hit.slot.departmentId);
  return (
    <section aria-label="Selected product" className="w-80 max-w-full rounded-md border border-line bg-surface p-4 shadow-pop">
      <div className="flex items-start gap-3">
        {p.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt="" width={64} height={80} className="h-20 w-16 shrink-0 rounded-sm bg-ink/6 object-cover" />
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-mute">{zone.name} · {p.brandName}</p>
          <h2 className="font-display text-xl leading-tight">{p.name}</h2>
          <div className="flex flex-wrap gap-1.5">{p.demo && <Label>Demo product</Label>}{p.availability === "out_of_stock" && <Label kind="ink">Sold out</Label>}</div>
          {p.price && <p className="text-sm">{formatMoney(p.price)}</p>}
        </div>
        <button type="button" onClick={() => cameraManager.back()} aria-label="Close product details" className="grid size-9 shrink-0 place-items-center rounded-sm hover:bg-ink/8"><Icon name="close" size={16} /></button>
      </div>
      {p.demo && <p className="mt-3 text-xs text-mute">Demo data for testing the store. Not a real item, price or photograph.</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => useDetailSheet.getState().open(p.slug)}>View details</Button>
        <Button href={`/product/${p.slug}`} size="sm" variant="secondary">Open in shop</Button>
        <Button size="sm" variant="secondary" onClick={() => cameraManager.back()}>← Back to {depth > 1 ? "the room" : "where you were"}</Button>
      </div>
      <Link href={`/shop?dept=${p.department}`} className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] hover:text-accent-ink">All {zone.name} in shop <Icon name="arrow" size={14} /></Link>
    </section>
  );
}
