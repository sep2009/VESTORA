"use client";
import Link from "next/link";
import type { ResolvedDisplay } from "@/modules/showroom/types";
import { getZone } from "@/modules/showroom/layout";
import { useShowroom } from "@/stores/showroom-store";
import { Label } from "@/components/product/ProductLabel";
import { Icon } from "@/components/ui/Icon";

/** Details for the selected display. Real products link to their page; samples say plainly that they are samples. */
export function DisplayInfo({ displays }: { displays: readonly ResolvedDisplay[] }) {
  const id = useShowroom((s) => s.focusedDisplayId);
  const focus = useShowroom((s) => s.focusDisplay);
  const d = displays.find((x) => x.placement.id === id);
  if (!d) return null;
  const zone = getZone(d.placement.departmentId);
  return (
    <section aria-label="Selected product" className="w-72 max-w-[calc(100vw-2rem)] rounded-md border border-line bg-surface p-4 shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-mute">{zone.name}</p>
          <h2 className="font-display text-xl leading-tight">{d.product.name}</h2>
          {d.product.isSample && <Label>Sample product</Label>}
        </div>
        <button type="button" onClick={() => focus(null)} aria-label="Close product details" className="grid size-8 place-items-center rounded-sm hover:bg-ink/8"><Icon name="close" size={16} /></button>
      </div>
      {d.product.isSample
        ? <p className="mt-3 text-sm text-mute">A development placeholder. Real products replace it when the catalog is connected.</p>
        : d.product.slug && <Link href={`/product/${d.product.slug}`} className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] hover:text-accent-ink">View product <Icon name="arrow" size={14} /></Link>}
    </section>
  );
}
