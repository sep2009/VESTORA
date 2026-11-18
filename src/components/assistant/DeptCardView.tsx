"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { useMallGuide } from "@/stores/mall-guide";
import { useToasts } from "@/stores/toast-store";
import type { AItem } from "@/modules/assistant/core";
import { ZoneMap } from "./ZoneMap";

export type DeptData = { slug: string; name: string; tagline: string; available: number; why: string; products: AItem[]; location: { zoneId: string; name: string; position: string; route: string[]; steps: string; neighbors: { direction: string; name: string }[] } | null };

/**
 * A department recommendation with its real place in the 3D mall. Nothing moves until the shopper asks: "Show on the map" only highlights the room
 * on the mall's minimap, and the camera flies there only after "Take me there".
 */
export function DeptCardView({ d, onProduct }: { d: DeptData; onProduct?: () => void }) {
  const path = usePathname(), inMall = path === "/", push = useToasts((s) => s.push), guide = useMallGuide();
  const loc = d.location;
  const take = async () => { const { cameraManager } = await import("@/modules/showroom/camera/manager"); cameraManager.whenReady(() => cameraManager.focusZone(loc!.zoneId as never)); push(`Heading to ${d.name}`, "info"); };
  return (
    <article className="rounded-md border border-line bg-surface p-4" data-testid="dept-card" data-dept={d.slug}>
      <div className="flex flex-wrap gap-4">
        {loc && <div className="w-40 shrink-0"><ZoneMap zoneId={loc.zoneId} route={loc.route} label={`Floor plan: ${d.name} is ${loc.position}`} /></div>}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-accent-ink">Department</p>
          <h3 className="font-display text-xl leading-tight">{d.name}</h3>
          <p className="mt-1 text-sm text-mute">{d.why}</p>
          {loc ? <><p className="mt-2 text-sm"><strong className="font-medium">In the mall:</strong> {d.name} is {loc.position}.</p>
            <p className="mt-1 text-sm text-mute" data-testid="dept-steps">{loc.steps}{loc.neighbors.length ? ` Next to ${loc.neighbors.map((n) => `${n.name} (${n.direction})`).join(", ")}.` : ""}</p></> : <p className="mt-2 text-sm text-mute">This department has no room in the 3D mall.</p>}
          {loc && <div className="mt-3 flex flex-wrap gap-2">
            {inMall ? <>
              <button className="min-h-10 rounded-sm border border-line px-3 text-sm hover:border-ink" onClick={() => { guide.set(guide.highlight === loc.zoneId ? null : loc.zoneId); }} aria-pressed={guide.highlight === loc.zoneId} data-testid="show-on-map">{guide.highlight === loc.zoneId ? "Hide on the minimap" : "Show on the minimap"}</button>
              <button className="min-h-10 rounded-sm bg-ink px-4 text-sm text-paper" onClick={take} data-testid="take-me-there">Take me there</button></>
              : <Link href={`/?dept=${d.slug}`} onClick={onProduct} className="inline-flex min-h-10 items-center rounded-sm bg-ink px-4 text-sm text-paper" data-testid="explore-dept">Explore this department</Link>}
            <Link href={`/shop?department=${d.slug}`} className="inline-flex min-h-10 items-center rounded-sm border border-line px-3 text-sm hover:border-ink">Browse in the shop</Link>
          </div>}
        </div>
      </div>
      {d.products.length > 0 && <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{d.products.map((p) => (
        <li key={p.id}><Link href={`/product/${p.slug}`} className="block overflow-hidden rounded-sm border border-line hover:border-ink">{/* eslint-disable-next-line @next/next/no-img-element */}{p.image && <img src={p.image} alt="" loading="lazy" className="aspect-[4/5] w-full bg-paper object-cover" />}<span className="block p-2"><span className="line-clamp-2 block text-xs">{p.name}</span><span className="text-xs text-mute">{p.price ? formatMoney(p.price) : ""}</span></span></Link></li>))}</ul>}
    </article>
  );
}
