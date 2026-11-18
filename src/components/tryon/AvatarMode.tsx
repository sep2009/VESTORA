"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AvatarCanvas } from "@/components/outfit/AvatarCanvas";
import type { StageApi } from "@/components/outfit/avatar3d/Stage";
import { AvatarPicker } from "@/components/outfit/StudioPanels";
import { wornItems } from "@/components/outfit/studio-lib";
import { cn } from "@/lib/cn";
import { encodeShare, place, removeSlot, SLOT_LABEL, type Pick, type Picks, type StudioItem } from "@/modules/outfit/core";
import { useOutfits } from "@/stores/outfit-store";
import { useToasts } from "@/stores/toast-store";
import { useTryOnResults, type AvatarResult } from "@/stores/tryon-store";
import type { TryOnItem } from "@/server/catalog/tryon-items";
import { useMounted } from "@/lib/use-mounted";

const ctl = "min-h-10 shrink-0 rounded-sm border border-line bg-surface px-3 text-sm hover:border-ink disabled:opacity-40";

export function AvatarMode({ items, item, pick }: { items: TryOnItem[]; item: TryOnItem | null; pick: Pick | null }) {
  const mounted = useMounted(), push = useToasts((s) => s.push);
  const avatar = useOutfits((s) => s.avatar), setAvatar = useOutfits((s) => s.setAvatar);
  const { avatarResults, saveAvatar, removeAvatar } = useTryOnResults();
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i as StudioItem])), [items]);
  const resolve = (id: string) => byId.get(id);
  const [picks, setPicks] = useState<Picks>({});
  const api = useRef<StageApi | null>(null);
  const [cmp, setCmp] = useState<string[]>([]);

  // Selecting a product puts it on the avatar (replacing only what it overlaps); changing its color or size updates it live.
  useEffect(() => {
    if (!item || !pick || !item.slot) return;
    setPicks((cur) => place(cur, item, pick, resolve).picks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, pick?.color, pick?.size, pick?.sku]);

  const worn = useMemo(() => wornItems(picks, resolve), [picks]); // eslint-disable-line react-hooks/exhaustive-deps
  const label = (p: Picks) => Object.values(p).map((x) => byId.get(x.productId)?.name ?? "Item").join(" + ");
  const toggleCmp = (id: string) => setCmp((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-2)));
  const compared = cmp.map((id) => avatarResults.find((r) => r.id === id)).filter((r): r is AvatarResult => !!r);

  return (
    <div className="space-y-4">
      <div className="relative h-[min(60svh,34rem)] overflow-hidden rounded-lg border border-line bg-[#e9e6df]" data-testid="avatar-stage">
        {mounted && <AvatarCanvas avatar={avatar} worn={worn} apiRef={api} spin={false} />}
        <span className="pointer-events-none absolute left-3 top-3 rounded-sm bg-ink/85 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-paper">Avatar preview</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="Camera">
        {(["front", "back", "left", "right"] as const).map((v) => <button key={v} className={ctl} onClick={() => api.current?.view(v)}>{v === "front" ? "Front" : v === "back" ? "Back" : v === "left" ? "Left side" : "Right side"}</button>)}
        <button className={ctl} onClick={() => api.current?.zoom(0.8)}>Zoom +</button><button className={ctl} onClick={() => api.current?.zoom(1.25)}>Zoom −</button><button className={ctl} onClick={() => api.current?.reset()}>Reset camera</button>
      </div>
      <p className="text-xs leading-relaxed text-mute">A generic mannequin wearing a generic garment shape in the product’s color. It is not you and does not show the real cut, pattern or fit.</p>

      <div className="rounded-md border border-line bg-surface p-3">
        <p className="mb-2 text-xs uppercase tracking-wider text-mute">On the avatar</p>
        {worn.length === 0 ? <p className="text-sm text-mute">Choose a product on the left to put it on the avatar.</p> : (
          <ul className="flex flex-wrap gap-2">{worn.map((w) => (
            <li key={w.slot} className="flex items-center gap-2 rounded-full border border-line py-1 pl-3 pr-1 text-sm"><span className="text-xs text-mute">{SLOT_LABEL[w.slot as keyof typeof SLOT_LABEL]}</span> {w.item.name}
              <button className="grid size-8 place-items-center rounded-full hover:bg-paper" aria-label={`Remove ${w.item.name} from the avatar`} onClick={() => setPicks((c) => removeSlot(c, w.slot as never))}>×</button></li>))}</ul>)}
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={ctl} disabled={worn.length === 0} onClick={() => push(saveAvatar({ avatar, picks, label: label(picks) }) ? "Saved this avatar preview" : "Add an item first (you can keep up to 20 saved previews).", "success")}>Save result</button>
          <button className={ctl} disabled={worn.length === 0} onClick={() => setPicks({})}>Clear</button>
          {worn.length > 0 && <Link className={cn(ctl, "inline-flex items-center")} href={`/style-creator?o=${encodeShare(avatar, picks, "")}`}>Open in Outfit Studio</Link>}
        </div>
      </div>

      <details className="rounded-md border border-line bg-surface p-3"><summary className="min-h-10 cursor-pointer text-sm font-medium">Choose avatar</summary><div className="mt-3"><AvatarPicker avatar={avatar} onChange={setAvatar} /></div></details>

      <section aria-label="Saved avatar previews" className="rounded-md border border-line bg-surface p-3">
        <p className="mb-2 text-xs uppercase tracking-wider text-mute">Saved avatar previews ({mounted ? avatarResults.length : 0}) · stored in this browser</p>
        {!mounted || avatarResults.length === 0 ? <p className="text-sm text-mute">Nothing saved yet.</p> : (
          <ul className="space-y-2">{avatarResults.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex min-h-10 min-w-0 basis-full items-center gap-2 sm:basis-0 sm:flex-1"><input type="checkbox" checked={cmp.includes(r.id)} onChange={() => toggleCmp(r.id)} /> <span className="truncate">{r.label || "Preview"}</span></label>
              <button className={ctl} onClick={() => { useOutfits.getState().setAvatar(r.avatar); setPicks(r.picks); }}>Open</button>
              <button className={ctl} onClick={() => { removeAvatar(r.id); setCmp((c) => c.filter((x) => x !== r.id)); }} aria-label={`Delete saved preview ${r.label}`}>Delete</button></li>))}</ul>)}
        {avatarResults.length > 1 && <p className="mt-2 text-xs text-mute">Tick two to compare them side by side.</p>}
        {compared.length === 2 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="avatar-compare">
            {compared.map((r) => <CompareStage key={r.id} r={r} resolve={resolve} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function CompareStage({ r, resolve }: { r: AvatarResult; resolve: (id: string) => StudioItem | undefined }) {
  const api = useRef<StageApi | null>(null), worn = useMemo(() => wornItems(r.picks, resolve), [r, resolve]);
  return (
    <figure className="overflow-hidden rounded-md border border-line">
      <div className="relative h-72 bg-[#e9e6df]"><AvatarCanvas avatar={r.avatar} worn={worn} apiRef={api} spin={false} /><span className="absolute left-2 top-2 rounded-sm bg-ink/85 px-2 py-0.5 text-[10px] uppercase tracking-wider text-paper">Avatar preview</span></div>
      <figcaption className="p-2 text-xs text-mute">{worn.map((w) => w.item.name).join(" + ")}</figcaption>
    </figure>
  );
}
