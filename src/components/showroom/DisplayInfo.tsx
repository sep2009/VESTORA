"use client";
import Link from "next/link";
import type { ResolvedDisplay } from "@/modules/showroom/types";
import { getZone } from "@/modules/showroom/layout";
import { cameraManager } from "@/modules/showroom/camera/manager";
import { selectFocusedDisplayId, useCameraStore } from "@/stores/camera-store";
import { Label } from "@/components/product/ProductLabel";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

/** Product interface for the focused display. Closing it restores the exact previous camera state. */
export function DisplayInfo({ displays }: { displays: readonly ResolvedDisplay[] }) {
  const id = useCameraStore(selectFocusedDisplayId);
  const depth = useCameraStore((s) => s.backDepth);
  const d = id ? displays.find((x) => x.placement.id === id) : undefined;
  if (!d) return null;
  const zone = getZone(d.placement.departmentId);
  return (
    <section aria-label="Selected product" className="w-80 max-w-full rounded-md border border-line bg-surface p-4 shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-mute">{zone.name}</p>
          <h2 className="font-display text-xl leading-tight">{d.product.name}</h2>
          <div className="flex flex-wrap gap-1.5">{d.product.isSample && <Label>Sample product</Label>}{!d.product.modelUrl && <Label>Placeholder model</Label>}</div>
        </div>
        <button type="button" onClick={() => cameraManager.back()} aria-label="Close product details" className="grid size-9 place-items-center rounded-sm hover:bg-ink/8"><Icon name="close" size={16} /></button>
      </div>
      {d.product.isSample
        ? <p className="mt-3 text-sm text-mute">A development placeholder. Real products replace it when the catalog is connected.</p>
        : d.product.slug && <Link href={`/product/${d.product.slug}`} className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] hover:text-accent-ink">View product <Icon name="arrow" size={14} /></Link>}
      <div className="mt-4"><Button size="sm" variant="secondary" onClick={() => cameraManager.back()}>← Back to {depth > 1 ? "the room" : "where you were"}</Button></div>
    </section>
  );
}
