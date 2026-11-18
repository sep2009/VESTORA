"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BODIES } from "./avatar3d/body";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import {
  BODY_IDS, HAIR_COLORS, HAIR_IDS, OCCASIONS, OCCASION_LABEL, SKIN_TONES, SLOTS, SLOT_LABEL, TABS, TAB_LABEL, colorsInStock, hexFor, inTab, purchaseIssue, rateWorn, suggest, variantStock,
  type AvatarConfig, type Occasion, type Picks, type Slot, type StudioItem,
} from "@/modules/outfit/core";
import type { SavedOutfit } from "@/stores/outfit-store";
import { defaultColor, totalsFor, withVariant, type Resolve } from "./studio-lib";

const chip = (on: boolean) => cn("min-h-10 shrink-0 rounded-full border px-4 text-sm", on ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:border-ink");
const btn = "min-h-10 rounded-sm border border-line px-3 text-sm hover:border-ink disabled:opacity-40";
const Price = ({ item }: { item: StudioItem }) => item.price ? <span className="text-sm">{item.compareAt && <s className="mr-1 text-mute">{formatMoney(item.compareAt)}</s>}{formatMoney(item.price)}</span> : <span className="text-sm text-mute">Price not listed</span>;
// eslint-disable-next-line @next/next/no-img-element
const Thumb = ({ item, size = "size-14" }: { item: StudioItem; size?: string }) => item.image ? <img src={item.image} alt="" loading="lazy" className={cn(size, "shrink-0 rounded-sm bg-paper object-cover")} /> : <span className={cn(size, "shrink-0 rounded-sm bg-paper")} />;

// ---------------- items ----------------
export function ItemBrowser({ items, picks, onPick, occasion }: { items: StudioItem[]; picks: Picks; onPick: (i: StudioItem) => void; occasion: Occasion | null }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("tshirts");
  const [aud, setAud] = useState<"all" | "men" | "women">("all");
  const [q, setQ] = useState("");
  const [onlyBuyable, setOnlyBuyable] = useState(false);
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t, items.filter((i) => inTab(i, t)).length])) as Record<(typeof TABS)[number], number>, [items]);
  const list = useMemo(() => items.filter((i) => inTab(i, tab) && (aud === "all" || i.audience === "unisex" || i.audience === aud) && (!onlyBuyable || i.available) && (!q || `${i.name} ${i.brandName}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => Number(b.available) - Number(a.available) || Number(occasion ? b.occasions.includes(occasion) : 0) - Number(occasion ? a.occasions.includes(occasion) : 0) || Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name)), [items, tab, aud, q, onlyBuyable, occasion]);
  return (
    <div>
      <div role="tablist" aria-label="Garment categories" className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-2">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={chip(tab === t)}>{TAB_LABEL[t]} <span className="opacity-60">{counts[t]}</span></button>)}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <label className="sr-only" htmlFor="so-q">Search products</label>
        <input id="so-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-h-10 w-32 flex-1 rounded-sm border border-line bg-surface px-3" />
        <label className="sr-only" htmlFor="so-aud">Audience</label>
        <select id="so-aud" value={aud} onChange={(e) => setAud(e.target.value as typeof aud)} className="min-h-10 rounded-sm border border-line bg-surface px-2">
          <option value="all">All fits</option><option value="men">Men’s</option><option value="women">Women’s</option>
        </select>
        <label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={onlyBuyable} onChange={(e) => setOnlyBuyable(e.target.checked)} /> In stock only</label>
      </div>
      {list.length === 0 ? <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-mute">No products match these filters.</p> : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3" aria-label={`${TAB_LABEL[tab]} products`}>
          {list.map((i) => {
            const worn = !!i.slot && picks[i.slot]?.productId === i.id, soldOut = !i.available;
            return (
              <li key={i.id}>
                <button type="button" onClick={() => onPick(i)} disabled={soldOut} aria-pressed={worn} aria-label={`${worn ? "Worn: " : ""}${i.name}, ${i.brandName}${soldOut ? ", sold out" : ""}`}
                  className={cn("group relative block w-full overflow-hidden rounded-md border bg-surface text-left", worn ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink", soldOut && "opacity-55")}>
                  <span className="relative block aspect-[4/5] bg-paper">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {i.image && <img src={i.image} alt="" loading="lazy" className="size-full object-cover" />}
                    {soldOut && <span className="absolute left-2 top-2 rounded-sm bg-ink px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-paper">Sold out</span>}
                    {worn && <span className="absolute right-2 top-2 rounded-sm bg-accent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-ink">On avatar</span>}
                  </span>
                  <span className="block space-y-1 p-2.5">
                    <span className="block truncate text-xs uppercase tracking-wider text-mute">{i.brandName}</span>
                    <span className="line-clamp-2 block min-h-[2.5rem] text-sm leading-snug">{i.name}</span>
                    <span className="flex items-center justify-between gap-2"><Price item={i} />
                      <span className="flex -space-x-1" aria-hidden="true">{colorsInStock(i).slice(0, 4).map((c) => <span key={c.name} className="size-4 rounded-full border border-surface ring-1 ring-line" style={{ background: hexFor(i, c.name) }} />)}</span></span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------- avatar ----------------
export function AvatarPicker({ avatar, onChange }: { avatar: AvatarConfig; onChange: (p: Partial<AvatarConfig>) => void }) {
  const group = (p: "masculine" | "feminine") => BODY_IDS.filter((id) => BODIES[id]!.presentation === p);
  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-mute">Pick a mannequin. These are generic presets, not a model of your body, and nothing about you is asked or stored. Garments are shown on the preset you choose.</p>
      {(["masculine", "feminine"] as const).map((p) => (
        <fieldset key={p}>
          <legend className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-ink">{p === "masculine" ? "Masculine presentation" : "Feminine presentation"}</legend>
          <div className="grid grid-cols-2 gap-3">
            {group(p).map((id) => { const b = BODIES[id]!; return (
              <label key={id} className={cn("flex min-h-14 cursor-pointer items-center gap-3 rounded-md border bg-surface p-3", avatar.body === id ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink")}>
                <input type="radio" name="body" className="sr-only" checked={avatar.body === id} onChange={() => onChange({ body: id })} />
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-paper text-sm">{b.label[0]}</span>
                <span><span className="block text-sm font-medium">{b.label}</span><span className="block text-xs text-mute">{b.height >= 1.8 ? "Taller, broader frame" : b.height >= 1.74 ? "Medium frame" : "Compact frame"}</span></span>
              </label>); })}
          </div>
        </fieldset>
      ))}
      <fieldset><legend className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-ink">Skin tone</legend>
        <div className="flex flex-wrap gap-2">{SKIN_TONES.map((c, i) => <Swatch key={c} color={c} on={avatar.skin === i} label={`Skin tone ${i + 1}`} onClick={() => onChange({ skin: i })} />)}</div></fieldset>
      <fieldset><legend className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-ink">Hairstyle</legend>
        <div className="flex flex-wrap gap-2">{HAIR_IDS.map((h) => <button key={h} type="button" aria-pressed={avatar.hair === h} onClick={() => onChange({ hair: h })} className={chip(avatar.hair === h)}>{h === "none" ? "No hair" : h[0]!.toUpperCase() + h.slice(1)}</button>)}</div></fieldset>
      <fieldset disabled={avatar.hair === "none"}><legend className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-ink">Hair color</legend>
        <div className="flex flex-wrap gap-2">{HAIR_COLORS.map((c, i) => <Swatch key={c} color={c} on={avatar.hairColor === i} label={`Hair color ${i + 1}`} onClick={() => onChange({ hairColor: i })} />)}</div></fieldset>
      <p className="text-xs text-mute">Glasses and watches come from the catalog: pick them under Accessories.</p>
    </div>
  );
}
function Swatch({ color, on, label, onClick }: { color: string; on: boolean; label: string; onClick: () => void }) {
  return <button type="button" aria-label={label} aria-pressed={on} onClick={onClick} className={cn("size-10 rounded-full border-2", on ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-paper" : "border-surface ring-1 ring-line")} style={{ background: color }} />;
}

// ---------------- current outfit ----------------
export function OutfitPanel(p: {
  items: StudioItem[]; resolve: Resolve; picks: Picks; occasion: Occasion | null; onOccasion: (o: Occasion | null) => void;
  onChange: (slot: Slot, next: import("@/modules/outfit/core").Pick) => void; onRemove: (s: Slot) => void; onUse: (item: StudioItem, color: string | null) => void;
  onComplete: () => void; onClear: () => void; onCart: () => void; cartPlan: { count: number; skipped: { name: string; reason: string }[] };
  name: string; onName: (n: string) => void; activeSaved: SavedOutfit | null; onSave: () => void; onSaveCopy: () => void; onShare: () => void; onFavorite: () => void; onNew: () => void;
}) {
  const { picks, resolve } = p;
  const slots = SLOTS.filter((s) => picks[s]);
  const totalAll = totalsFor(picks, resolve, false), totalBuy = totalsFor(picks, resolve, true);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1"><label htmlFor="so-name" className="mb-1 block text-xs uppercase tracking-wider text-mute">Outfit name</label>
          <input id="so-name" value={p.name} onChange={(e) => p.onName(e.target.value)} maxLength={60} placeholder="Untitled outfit" className="min-h-11 w-full rounded-sm border border-line bg-surface px-3" /></div>
        <div><label htmlFor="so-occ" className="mb-1 block text-xs uppercase tracking-wider text-mute">Occasion</label>
          <select id="so-occ" value={p.occasion ?? ""} onChange={(e) => p.onOccasion((e.target.value || null) as Occasion | null)} className="min-h-11 rounded-sm border border-line bg-surface px-2">
            <option value="">Any</option>{OCCASIONS.map((o) => <option key={o} value={o}>{OCCASION_LABEL[o]}</option>)}</select></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={btn + " !bg-ink !text-paper"} onClick={p.onSave} disabled={slots.length === 0}>{p.activeSaved ? "Save changes" : "Save outfit"}</button>
        {p.activeSaved && <button className={btn} onClick={p.onSaveCopy}>Save as copy</button>}
        {p.activeSaved && <button className={btn} aria-pressed={p.activeSaved.favorite} onClick={p.onFavorite}>{p.activeSaved.favorite ? "★ Favorite" : "☆ Favorite"}</button>}
        <button className={btn} onClick={p.onShare} disabled={slots.length === 0}>Share</button>
        <button className={btn} onClick={p.onNew}>New outfit</button>
        <button className={btn} onClick={p.onComplete}>Complete my look</button>
        <button className={btn} onClick={p.onClear} disabled={slots.length === 0}>Clear all</button>
      </div>

      {slots.length === 0 ? <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-mute">Your avatar is not wearing anything yet. Pick products under Items, or press “Complete my look”.</p> : (
        <ul className="space-y-3">{slots.map((s) => <WornRow key={s} slot={s} {...p} />)}</ul>
      )}

      {slots.length > 0 && (
        <div className="space-y-3 rounded-md border border-line bg-surface p-4" aria-live="polite">
          <div className="flex items-baseline justify-between"><span className="text-sm text-mute">{slots.length} item{slots.length === 1 ? "" : "s"}</span>
            <span className="font-medium">{totalAll.map((t) => formatMoney({ amount: t.amount, currency: t.currency })).join(" + ") || "—"}</span></div>
          {totalBuy.length > 0 && totalAll.map((t) => t.amount).join() !== totalBuy.map((t) => t.amount).join() && <p className="text-xs text-mute">Available now: {totalBuy.map((t) => formatMoney({ amount: t.amount, currency: t.currency })).join(" + ")}</p>}
          <button className="min-h-12 w-full rounded-sm bg-ink px-4 text-sm font-medium uppercase tracking-[0.12em] text-paper disabled:opacity-40" onClick={p.onCart} disabled={p.cartPlan.count === 0}>
            Add {p.cartPlan.count} available item{p.cartPlan.count === 1 ? "" : "s"} to cart</button>
          {p.cartPlan.skipped.length > 0 && <ul className="space-y-1 text-xs text-warn" role="status">{p.cartPlan.skipped.map((k) => <li key={k.name}>Not added: {k.name} ({k.reason})</li>)}</ul>}
        </div>
      )}
    </div>
  );
}

function WornRow({ slot, picks, resolve, items, occasion, onChange, onRemove, onUse }: Parameters<typeof OutfitPanel>[0] & { slot: Slot }) {
  const pick = picks[slot]!, item = resolve(pick.productId);
  const [alts, setAlts] = useState(false), [page, setPage] = useState(0);
  const rate = useMemo(() => rateWorn(slot, picks, resolve, { occasion }), [slot, picks, resolve, occasion]);
  const sugg = useMemo(() => (alts && item ? suggest(slot, picks, items, resolve, { occasion, exclude: new Set([item.id]) }) : []), [alts, slot, picks, items, resolve, occasion, item]);
  if (!item) return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-warn/40 bg-surface p-3 text-sm"><span>{SLOT_LABEL[slot]}: this product is no longer in the catalog.</span><button className={btn} onClick={() => onRemove(slot)}>Remove</button></li>);
  const issue = purchaseIssue(item, pick);
  const colors = item.colors, sizes = item.sizes;
  const shown = sugg.length ? Array.from({ length: Math.min(3, sugg.length) }, (_, k) => sugg[(page * 3 + k) % sugg.length]!) : [];
  return (
    <li className="rounded-md border border-line bg-surface p-3" data-slot={slot}>
      <div className="flex gap-3">
        <Thumb item={item} size="size-16" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-accent-ink">{SLOT_LABEL[slot]}</p>
          <Link href={`/product/${item.slug}`} className="line-clamp-2 text-sm font-medium leading-snug hover:underline" target="_blank">{item.name}</Link>
          <p className="text-xs text-mute">{item.brandName} · <Price item={item} /></p>
          {!item.available && <p className="mt-1 text-xs font-medium text-danger">Sold out: not available to buy</p>}
        </div>
        <button className="h-9 shrink-0 self-start rounded-sm px-2 text-sm text-mute hover:text-ink" onClick={() => onRemove(slot)} aria-label={`Remove ${item.name}`}>Remove</button>
      </div>
      {item.available && (colors.length > 0 || sizes.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          {colors.length > 0 && <div role="group" aria-label={`${item.name} color`} className="flex items-center gap-1.5">
            {colors.map((c) => { const left = variantStock(item, pick.size, c.name), on = (pick.color ?? defaultColor(item)) === c.name, out = variantStock(item, null, c.name) === 0;
              return <button key={c.name} type="button" disabled={out} aria-pressed={on} aria-label={`${c.name}${out ? " (sold out)" : left === 0 ? " (not in this size)" : ""}`} title={c.name}
                onClick={() => onChange(slot, withVariant(item, pick, { color: c.name }))} className={cn("relative size-8 rounded-full border-2", on ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-surface" : "border-surface ring-1 ring-line", out && "opacity-35")} style={{ background: hexFor(item, c.name) }} />; })}
            <span className="ml-1 text-xs text-mute">{pick.color ?? defaultColor(item)}</span></div>}
          {sizes.length > 0 && <div className="flex items-center gap-2"><label htmlFor={`sz-${slot}`} className="text-xs text-mute">Size</label>
            <select id={`sz-${slot}`} value={pick.size ?? ""} onChange={(e) => onChange(slot, withVariant(item, pick, { size: e.target.value || null }))} className="min-h-10 rounded-sm border border-line bg-paper px-2 text-sm">
              <option value="">Choose</option>{sizes.map((z) => { const n = variantStock(item, z, item.colors.length > 1 ? pick.color ?? defaultColor(item) : null); return <option key={z} value={z} disabled={n === 0}>{z}{n === 0 ? " (sold out)" : n <= 3 ? ` (${n} left)` : ""}</option>; })}</select></div>}
        </div>
      )}
      {issue && item.available && <p className="mt-2 text-xs text-warn">To buy this: {issue}.</p>}
      {rate && <p className="mt-2 text-xs text-mute">Match {Math.round(rate.score * 100)}%{rate.reasons.length ? ` · ${rate.reasons.slice(0, 2).join(" · ")}` : ""}</p>}
      <button className="mt-2 min-h-9 text-sm underline underline-offset-4" aria-expanded={alts} onClick={() => { setAlts(!alts); setPage(0); }}>{alts ? "Hide alternatives" : "Show alternatives"}</button>
      {alts && (
        <div className="mt-2 space-y-2 border-t border-line pt-3">
          {shown.length === 0 ? <p className="text-xs text-mute">No other available {SLOT_LABEL[slot].toLowerCase()} products to suggest.</p> : <>
            {shown.map((sg) => (
              <div key={sg.item.id} className="flex items-center gap-3">
                <Thumb item={sg.item} size="size-12" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm">{sg.item.name}</p><p className="truncate text-xs text-mute">{Math.round(sg.score * 100)}% match{sg.reasons[0] ? ` · ${sg.reasons[0]}` : sg.color ? ` · ${sg.color}` : ""}</p></div>
                <button className={btn} onClick={() => { onUse(sg.item, sg.color); setAlts(false); }}>Use</button>
              </div>))}
            {sugg.length > 3 && <button className="min-h-9 text-sm underline underline-offset-4" onClick={() => setPage(page + 1)}>Show different matches</button>}
          </>}
        </div>
      )}
    </li>
  );
}

// ---------------- saved ----------------
export function SavedPanel({ saved, activeId, resolve, onLoad, onRename, onDuplicate, onDelete, onFavorite, onShare }: {
  saved: SavedOutfit[]; activeId: string | null; resolve: Resolve; onLoad: (id: string) => void; onRename: (id: string, n: string) => void; onDuplicate: (id: string) => void; onDelete: (id: string) => void; onFavorite: (id: string) => void; onShare: (o: SavedOutfit) => void;
}) {
  const [onlyFav, setOnlyFav] = useState(false), [editing, setEditing] = useState<string | null>(null), [draft, setDraft] = useState(""), [confirm, setConfirm] = useState<string | null>(null);
  const list = saved.filter((o) => !onlyFav || o.favorite).sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt);
  if (saved.length === 0) return <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-mute">No saved outfits yet. Build one and press Save outfit. Outfits are stored in this browser.</p>;
  return (
    <div className="space-y-3">
      <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} /> Favorites only</label>
      <ul className="space-y-3">
        {list.map((o) => {
          const its = SLOTS.flatMap((s) => { const p = o.picks[s]; const it = p && resolve(p.productId); return it ? [it] : []; });
          const missing = Object.values(o.picks).length - its.length, sold = its.filter((i) => !i.available).length;
          return (
            <li key={o.id} className={cn("rounded-md border bg-surface p-3", o.id === activeId ? "border-ink" : "border-line")}>
              <div className="flex items-start gap-2">
                {editing === o.id ? (
                  <form className="flex min-w-0 flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); onRename(o.id, draft); setEditing(null); }}>
                    <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={60} aria-label="Outfit name" className="min-h-10 min-w-0 flex-1 rounded-sm border border-line px-2" />
                    <button className={btn}>Save</button><button type="button" className={btn} onClick={() => setEditing(null)}>Cancel</button></form>
                ) : <p className="min-w-0 flex-1 truncate font-medium">{o.name}{o.id === activeId && <span className="ml-2 text-xs font-normal text-mute">editing</span>}</p>}
                <button aria-pressed={o.favorite} aria-label={`${o.favorite ? "Remove from" : "Add to"} favorite outfits: ${o.name}`} onClick={() => onFavorite(o.id)} className="grid size-10 place-items-center text-lg">{o.favorite ? "★" : "☆"}</button>
              </div>
              <div className="my-2 flex gap-1.5">{its.slice(0, 6).map((i) => <Thumb key={i.id} item={i} size="size-11" />)}</div>
              <p className="text-xs text-mute">{its.length} item{its.length === 1 ? "" : "s"}{sold > 0 ? ` · ${sold} sold out` : ""}{missing > 0 ? ` · ${missing} no longer in catalog` : ""}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className={btn + " !bg-ink !text-paper"} onClick={() => onLoad(o.id)}>Open</button>
                <button className={btn} onClick={() => { setEditing(o.id); setDraft(o.name); }}>Rename</button>
                <button className={btn} onClick={() => onDuplicate(o.id)}>Duplicate</button>
                <button className={btn} onClick={() => onShare(o)}>Share</button>
                {confirm === o.id ? <><button className={btn + " !border-danger !text-danger"} onClick={() => { onDelete(o.id); setConfirm(null); }}>Delete for good</button><button className={btn} onClick={() => setConfirm(null)}>Keep</button></> : <button className={btn} onClick={() => setConfirm(o.id)}>Delete</button>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
