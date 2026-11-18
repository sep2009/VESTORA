"use client";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { MODES, MODE_INFO, garmentCategoryFor, type Mode } from "@/modules/tryon/core";
import type { Pick } from "@/modules/outfit/core";
import type { TryOnItem } from "@/server/catalog/tryon-items";
import { defaultColor, withVariant } from "@/components/outfit/studio-lib";
import { AvatarMode } from "./AvatarMode";
import { GarmentMode } from "./GarmentMode";
import { PhotoMode } from "./PhotoMode";
import { ProductBar } from "./ProductBar";
import type { TryOnConfig } from "./tryon-client";

const GROUPS = [["all", "All"], ["upper_body", "Tops"], ["lower_body", "Bottoms"], ["dress", "Dresses"], ["outerwear", "Jackets & coats"], ["shoes", "Shoes"], ["bags", "Bags"], ["accessories", "Accessories"]] as const;
const groupOf = (i: TryOnItem) => garmentCategoryFor(i.kind) ?? (i.kind === "sneaker" ? "shoes" : i.kind === "bag" ? "bags" : "accessories");
const accent: Record<Mode, string> = { avatar: "border-t-ink", photo: "border-t-accent", garment3d: "border-t-ok" };

function supports(mode: Mode, i: TryOnItem, providerOn: boolean): { ok: boolean; why: string | null } {
  if (mode === "avatar") return { ok: !!i.slot, why: null };
  if (mode === "garment3d") return { ok: !!i.model, why: i.model ? null : "No 3D model yet" };
  if (!providerOn) return { ok: true, why: null }; // nothing to filter by while photo try-on is unavailable
  return { ok: i.photo.supported, why: i.photo.supported ? null : "Not supported for photo try-on" };
}

export function TryOnApp({ items, config, initialSlug, initialMode }: { items: TryOnItem[]; config: TryOnConfig; initialSlug: string | null; initialMode: string | null }) {
  const startMode = (MODES as readonly string[]).includes(initialMode ?? "") ? (initialMode as Mode) : "avatar";
  const first = items.find((i) => i.slug === initialSlug) ?? items.find((i) => i.available) ?? items[0] ?? null;
  const [mode, setMode] = useState<Mode>(startMode);
  const [selId, setSelId] = useState<string | null>(first?.id ?? null);
  const [pick, setPick] = useState<Pick | null>(first ? { productId: first.id, sku: null, size: null, color: defaultColor(first) } : null);
  const [group, setGroup] = useState<(typeof GROUPS)[number][0]>("all"), [q, setQ] = useState("");
  const item = items.find((i) => i.id === selId) ?? null;
  const select = (i: TryOnItem) => { setSelId(i.id); setPick(withVariant(i, { productId: i.id, sku: null, size: null, color: defaultColor(i) }, {})); };
  const list = useMemo(() => items.filter((i) => (group === "all" || groupOf(i) === group) && (!q || `${i.name} ${i.brandName}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => Number(supports(mode, b, config.available).ok) - Number(supports(mode, a, config.available).ok) || Number(b.available) - Number(a.available) || a.name.localeCompare(b.name)), [items, group, q, mode, config.available]);
  const modeAvail = (m: Mode) => (m === "photo" ? (config.available ? "Configured" : "Not configured") : m === "garment3d" ? `${items.filter((i) => i.model).length} products` : "Always available");

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
      <header className="mb-5 max-w-3xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent-ink">Virtual try-on</p>
        <h1 className="font-display text-headline">Try it on, honestly</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">Three different ways to look at a product. Each one is labelled, and none of them tells you what size to buy.</p>
      </header>

      <div role="tablist" aria-label="Try-on mode" className="mb-5 grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <button key={m} role="tab" id={`mode-${m}`} aria-selected={mode === m} aria-controls="mode-panel" onClick={() => setMode(m)}
            className={cn("min-h-16 rounded-md border border-t-4 bg-surface p-3 text-left", accent[m], mode === m ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink")} data-mode={m}>
            <span className="block text-sm font-medium">{MODE_INFO[m].label}</span>
            <span className="block text-xs text-mute">{MODE_INFO[m].short}</span>
            <span className={cn("mt-1 block text-[11px] uppercase tracking-wider", m === "photo" && !config.available ? "text-danger" : "text-mute")}>{modeAvail(m)}</span>
          </button>))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        <aside aria-label="Products" className="min-w-0 lg:sticky lg:top-[7.4rem] lg:max-h-[calc(100svh-9rem)] lg:self-start lg:overflow-y-auto">
          <div role="group" aria-label="Garment categories" className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-2">
            {GROUPS.map(([id, label]) => <button key={id} aria-pressed={group === id} onClick={() => setGroup(id)} className={cn("min-h-10 shrink-0 rounded-full border px-4 text-sm", group === id ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:border-ink")}>{label}</button>)}
          </div>
          <label className="sr-only" htmlFor="tp-q">Search products</label>
          <input id="tp-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="mb-2 min-h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm" />
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2" aria-label="Product list">
            {list.map((i) => { const s = supports(mode, i, config.available), on = i.id === selId; return (
              <li key={i.id}>
                <button type="button" onClick={() => select(i)} aria-pressed={on} disabled={!s.ok} aria-label={`${i.name}, ${i.brandName}${!i.available ? ", sold out" : ""}${s.why ? `, ${s.why}` : ""}`}
                  className={cn("block w-full overflow-hidden rounded-md border bg-surface text-left", on ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink", !s.ok && "opacity-45")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className="block aspect-[4/5] bg-paper">{i.image && <img src={i.image} alt="" loading="lazy" className="size-full object-cover" />}</span>
                  <span className="block p-2"><span className="line-clamp-2 block min-h-[2.25rem] text-xs leading-snug">{i.name}</span>
                    <span className="block text-[11px] text-mute">{s.why ?? (!i.available ? "Sold out" : i.brandName)}</span></span>
                </button>
              </li>); })}
            {list.length === 0 && <li className="col-span-full rounded-md border border-dashed border-line p-4 text-center text-sm text-mute">No products match.</li>}
          </ul>
        </aside>

        <section id="mode-panel" role="tabpanel" aria-labelledby={`mode-${mode}`} className={cn("min-w-0 space-y-4 rounded-lg border border-t-4 border-line bg-paper p-3 sm:p-5", accent[mode])}>
          <div className="space-y-1">
            <h2 className="text-lg font-medium">{MODE_INFO[mode].label}</h2>
            <p className="text-sm text-mute">{MODE_INFO[mode].what} <span className="text-ink">{MODE_INFO[mode].notThis}</span></p>
          </div>
                    {mode === "avatar" && <AvatarMode items={items} item={item} pick={pick} />}
          {mode === "photo" && <PhotoMode config={config} item={item} pick={pick} items={items} />}
          {mode === "garment3d" && <GarmentMode item={item} items={items} onSelect={(id) => { const i = items.find((x) => x.id === id); if (i) select(i); }} />}
          {item && pick && <ProductBar item={item} pick={pick} onPick={setPick} />}
        </section>
      </div>
    </div>
  );
}
