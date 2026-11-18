"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { call } from "@/components/tryon/tryon-client";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { AItem, AState, OutfitCard } from "@/modules/assistant/core";
import { DEFAULT_AVATAR, SLOT_LABEL, encodeShare, type Picks } from "@/modules/outfit/core";
import { useCart } from "@/stores/cart-store";
import { useOutfits } from "@/stores/outfit-store";
import { useToasts } from "@/stores/toast-store";
import type { Allowed } from "@/stores/assistant-store";
import { AvatarPreview } from "./AvatarPreview";

type Row = { item: AItem; color: string | null; size: string | null };
const btn = "min-h-10 rounded-sm border border-line bg-surface px-3 text-sm hover:border-ink disabled:opacity-40";
const keyOf = (r: Row) => `${r.color ?? ""}|${r.size ?? ""}`;
/** The SKU for the chosen color and size, only if that combination is in stock. */
const skuOf = (r: Row): string | null => r.item.skus[keyOf(r)] ?? (r.item.sizes.length === 0 ? Object.entries(r.item.skus).find(([k]) => k.startsWith(`${r.color ?? ""}|`))?.[1] ?? null : null);
const issue = (r: Row): string | null => { if (r.item.sizes.length > 0 && !r.size) return "choose a size"; if (r.item.colors.length > 1 && !r.color) return "choose a color"; if (Object.keys(r.item.skus).length > 0 && !skuOf(r)) return "that color and size is out of stock"; return null; };

export function OutfitCardView({ o, state, allowed, profileAnswers, shownIds }: { o: OutfitCard; state: AState; allowed: Allowed; profileAnswers: unknown; shownIds: string[] }) {
  const push = useToasts((s) => s.push), add = useCart((s) => s.add);
  const [rows, setRows] = useState<Row[]>(() => o.items.map((item) => ({ item, color: item.color, size: null })));
  const [preview, setPreview] = useState(false), [alts, setAlts] = useState<{ slot: string; items: AItem[]; loading: boolean } | null>(null);
  const total = useMemo(() => rows.reduce((n, r) => n + (r.item.price?.amount ?? 0), 0), [rows]);
  const currency = rows[0]?.item.price?.currency ?? o.total.currency;
  const limit = state.budget?.scope === "total" ? state.budget.amount : null;
  const set = (i: number, p: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...p } : r)));
  const picks: Picks = Object.fromEntries(rows.map((r) => [r.item.slot, { productId: r.item.id, sku: skuOf(r), size: r.size, color: r.color }]));

  const loadAlts = async (i: number) => {
    const r = rows[i]!; setAlts({ slot: r.item.slot, items: [], loading: true });
    const res = await call<{ items: AItem[] }>("POST", "/api/assistant/alternatives", { outfitIds: rows.map((x) => x.item.id), slot: r.item.slot, state, exclude: [...shownIds, ...rows.map((x) => x.item.id)], limit: limit ?? undefined, context: { authorized: allowed, profileAnswers: allowed.profile ? profileAnswers : undefined } });
    if (!res.ok) { setAlts(null); return push(res.error, "error"); }
    setAlts({ slot: r.item.slot, items: res.data.items, loading: false });
  };
  const replace = (slot: string, next: AItem) => { setRows((rs) => rs.map((r) => (r.item.slot === slot ? { item: next, color: next.color, size: null } : r))); setAlts(null); push(`Swapped in ${next.name}`, "success"); };
  const addAll = () => {
    const ok = rows.filter((r) => !issue(r)), bad = rows.filter((r) => issue(r));
    ok.forEach((r) => add({ productId: r.item.id, slug: r.item.slug, name: r.item.name, brandName: r.item.brandName, image: r.item.image, sku: skuOf(r), size: r.size, color: r.color, unitPrice: r.item.price, source: r.item.source }, 1));
    push(ok.length ? `Added ${ok.length} item${ok.length === 1 ? "" : "s"} to your cart${bad.length ? `. Choose a size for ${bad.map((b) => b.item.name).join(", ")}` : ""}` : `Choose a size and color first: ${bad.map((b) => `${b.item.name} (${issue(b)})`).join(", ")}`, ok.length ? "success" : "error");
  };
  const save = () => { const id = useOutfits.getState().saveFrom(useOutfits.getState().avatar, picks, o.title); push(id ? `Saved “${o.title}” to your outfits` : "Could not save (you can keep up to 50 outfits).", id ? "success" : "error"); };
  const ready = rows.filter((r) => !issue(r)).length;

  return (
    <article className="rounded-lg border border-line bg-surface p-4" data-testid="outfit-card" data-outfit={o.id}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div><h3 className="font-display text-xl leading-tight">{o.title}</h3>{o.occasion && <p className="text-xs uppercase tracking-wider text-mute">{o.occasion}</p>}</div>
        <div className="text-right"><p className="font-medium" data-testid="outfit-total">{formatMoney({ amount: total, currency })}</p>
          <p className="text-xs text-mute">{limit ? (total <= limit ? `Within your ${formatMoney({ amount: limit, currency })} budget` : `Over your ${formatMoney({ amount: limit, currency })} budget`) : `${rows.length} pieces`} · Compatibility {o.match}%</p></div>
      </header>
      <ul className="mt-3 divide-y divide-line">
        {rows.map((r, i) => (
          <li key={r.item.id} className="py-3" data-slot={r.item.slot}>
            <div className="flex gap-3">
              <Link href={`/product/${r.item.slug}`} className="shrink-0" aria-label={`Open ${r.item.name}`}>{ }{r.item.image ? <img src={r.item.image} alt="" loading="lazy" className="size-20 rounded-sm bg-paper object-cover" /> : <span className="block size-20 rounded-sm bg-paper" />}</Link>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-accent-ink">{SLOT_LABEL[r.item.slot]}</p>
                <Link href={`/product/${r.item.slug}`} className="line-clamp-2 text-sm font-medium leading-snug hover:underline">{r.item.name}</Link>
                <p className="text-xs text-mute">{r.item.brandName} · {r.item.price ? <>{r.item.compareAt && <s className="mr-1">{formatMoney(r.item.compareAt)}</s>}{formatMoney(r.item.price)}</> : "Price not listed"} · <span className="text-ok">In stock</span></p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {r.item.colors.length > 0 && <div role="group" aria-label={`${r.item.name} color`} className="flex items-center gap-1.5">{r.item.colors.map((c) => <button key={c.name} type="button" aria-pressed={r.color === c.name} aria-label={c.name} title={c.name} onClick={() => set(i, { color: c.name, size: null })} className={cn("size-7 rounded-full border-2", r.color === c.name ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-surface" : "border-surface ring-1 ring-line")} style={{ background: c.hex }} />)}<span className="text-xs text-mute">{r.color}</span></div>}
                  {(() => { const sizes = [...new Set(Object.keys(r.item.skus).filter((k) => !r.color || k.startsWith(`${r.color}|`)).map((k) => k.split("|")[1]!).filter(Boolean))]; return sizes.length > 0 && <label className="flex items-center gap-2 text-xs text-mute">Size<select className="min-h-9 rounded-sm border border-line bg-paper px-2 text-sm text-ink" value={r.size ?? ""} onChange={(e) => set(i, { size: e.target.value || null })} aria-label={`${r.item.name} size`}><option value="">Choose</option>{sizes.map((z) => <option key={z} value={z}>{z}</option>)}</select></label>; })()}
                </div>
              </div>
              <button className="h-9 self-start rounded-sm px-2 text-sm text-mute hover:text-ink" onClick={() => void loadAlts(i)} aria-label={`Replace ${r.item.name}`} data-testid="replace">Replace</button>
            </div>
            {alts?.slot === r.item.slot && (
              <div className="mt-3 rounded-md bg-paper p-3" data-testid="alternatives">
                {alts.loading ? <p className="text-sm text-mute" role="status">Finding alternatives…</p> : alts.items.length === 0 ? <p className="text-sm text-mute">No other in-stock {SLOT_LABEL[r.item.slot].toLowerCase()} fits this outfit{limit ? " and budget" : ""}.</p> : (
                  <ul className="space-y-2">{alts.items.map((a) => (
                    <li key={a.id} className="flex items-center gap-3">{ }{a.image && <img src={a.image} alt="" loading="lazy" className="size-12 rounded-sm object-cover" />}
                      <span className="min-w-0 flex-1"><span className="line-clamp-1 block text-sm">{a.name}</span><span className="block text-xs text-mute">{a.price ? formatMoney(a.price) : ""}{a.why ? ` · ${a.why}` : ""}</span></span>
                      <button className={btn} onClick={() => replace(r.item.slot, a)} aria-label={`Use ${a.name}`}>Use</button></li>))}</ul>)}
                <button className="mt-2 min-h-9 text-xs underline underline-offset-4" onClick={() => setAlts(null)}>Close</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-2 space-y-1 text-sm leading-relaxed" data-testid="outfit-explanation"><p>{o.explanation}</p><p className="text-xs text-mute">Colors: {rows.map((r) => r.color).filter(Boolean).join(", ")}.</p></div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={cn(btn, "!bg-ink !text-paper")} onClick={addAll} data-testid="add-all">Add available items to cart{ready < rows.length ? ` (${ready}/${rows.length} ready)` : ""}</button>
        <button className={btn} aria-expanded={preview} onClick={() => setPreview((p) => !p)} data-testid="preview-toggle">{preview ? "Hide avatar preview" : "Preview on avatar"}</button>
        <button className={btn} onClick={save} data-testid="save-outfit">Save outfit</button>
        <Link className={cn(btn, "inline-flex items-center")} href={`/style-creator?o=${encodeShare(DEFAULT_AVATAR, picks, o.title.slice(0, 60))}`}>Open in Outfit Studio</Link>
      </div>
      {preview && <div className="mt-4"><AvatarPreview items={rows.map((r) => ({ item: r.item, color: r.color }))} /></div>}
    </article>
  );
}
