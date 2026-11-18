"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useMounted } from "@/lib/use-mounted";
import { completeLook, decodeShare, encodeShare, place, removeSlot, sanitize, SLOT_LABEL, type Occasion, type Pick, type Picks, type Slot, type StudioItem } from "@/modules/outfit/core";
import { useCart } from "@/stores/cart-store";
import { useOutfits, type SavedOutfit } from "@/stores/outfit-store";
import { useToasts } from "@/stores/toast-store";
import { AvatarCanvas } from "./AvatarCanvas";
import type { StageApi } from "./avatar3d/Stage";
import { FIT_QUALITY } from "./avatar3d/adapter";
import { AvatarPicker, ItemBrowser, OutfitPanel, SavedPanel } from "./StudioPanels";
import { defaultColor, planCart, withVariant, wornItems } from "./studio-lib";

type PanelId = "items" | "avatar" | "outfit" | "saved";
const ctl = "min-h-10 shrink-0 rounded-sm border border-line bg-surface/95 px-3 text-sm hover:border-ink";

export function OutfitStudio({ items }: { items: StudioItem[] }) {
  const mounted = useMounted();
  const push = useToasts((s) => s.push), addToCart = useCart((s) => s.add);
  const { avatar, picks: storedPicks, name, activeId, saved } = useOutfits();
  const o = useOutfits;
  const picks: Picks = mounted ? storedPicks : {};
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const resolve = useCallback((id: string) => byId.get(id), [byId]);
  const [panel, setPanel] = useState<PanelId>("items");
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [spin, setSpin] = useState(false);
  const api = useRef<StageApi | null>(null);
  const worn = useMemo(() => wornItems(picks, resolve), [picks, resolve]);
  const active = saved.find((s) => s.id === activeId) ?? null;
  const cartPlan = useMemo(() => planCart(picks, resolve), [picks, resolve]);

  // On arrival: open a shared outfit if the link has one, otherwise drop stored picks whose product vanished.
  useEffect(() => {
    if (!mounted) return;
    const code = new URLSearchParams(window.location.search).get("o");
    if (code) {
      const d = decodeShare(code);
      window.history.replaceState(null, "", window.location.pathname);
      if (!d) { push("That outfit link is not valid.", "error"); return; }
      const s = sanitize(d.picks, resolve);
      o.getState().adopt(d.avatar, s.picks, d.name); setPanel("outfit");
      push(s.dropped.length ? `Opened shared outfit. ${s.dropped.length} item${s.dropped.length === 1 ? " is" : "s are"} no longer in the catalog.` : "Opened shared outfit", s.dropped.length ? "info" : "success");
      return;
    }
    const cur = o.getState().picks, s = sanitize(cur, resolve);
    if (s.dropped.length) { o.getState().setPicks(s.picks); push(`${s.dropped.length} saved item${s.dropped.length === 1 ? " is" : "s are"} no longer in the catalog and was removed.`, "info"); }
  }, [mounted, resolve, o, push]);

  const put = (item: StudioItem, pick: Pick) => {
    const r = place(picks, item, pick, resolve); o.getState().setPicks(r.picks);
    if (r.removed.length) push(`${item.name} replaced: ${r.removed.map((s) => SLOT_LABEL[s].toLowerCase()).join(", ")}`, "info");
  };
  const pickItem = (item: StudioItem) => {
    if (!item.slot || !item.available) return;
    const ex = picks[item.slot];
    put(item, withVariant(item, ex?.productId === item.id ? ex : { productId: item.id, sku: null, size: null, color: defaultColor(item) }, {}));
  };
  const change = (slot: Slot, next: Pick) => o.getState().setPicks({ ...picks, [slot]: next });
  const useAlt = (item: StudioItem, color: string | null) => put(item, withVariant(item, { productId: item.id, sku: null, size: null, color }, {}));
  const complete = () => {
    const r = completeLook(picks, items, resolve, { occasion });
    o.getState().setPicks(r.picks);
    push(r.added.length ? `Added ${r.added.map((s) => SLOT_LABEL[s].toLowerCase()).join(", ")}. Choose sizes to buy.` : "Top, bottoms and shoes are already chosen.", r.added.length ? "success" : "info");
  };
  const toCart = () => {
    cartPlan.lines.forEach((l) => addToCart(l, 1));
    push(`Added ${cartPlan.lines.length} item${cartPlan.lines.length === 1 ? "" : "s"} to your cart${cartPlan.skipped.length ? `, ${cartPlan.skipped.length} skipped` : ""}`, "success");
  };
  const save = (asCopy = false) => {
    const id = asCopy ? o.getState().saveAsNew(name ? `${name} copy` : undefined) : o.getState().save();
    if (!id) return push(saved.length >= 50 ? "You can keep up to 50 saved outfits. Delete one first." : "Add at least one item before saving.", "error");
    push(`Saved “${o.getState().saved.find((s) => s.id === id)?.name}”`, "success");
  };
  const share = async (a = avatar, p = picks, n = name) => {
    const url = `${window.location.origin}/style-creator?o=${encodeShare(a, p, n)}`;
    try { if (navigator.share) { await navigator.share({ title: n || "My Vestora outfit", url }); return; } await navigator.clipboard.writeText(url); push("Outfit link copied", "success"); }
    catch (e) { if ((e as Error).name !== "AbortError") push("Could not share. Copy the address from your browser instead.", "error"); }
  };
  const loadSaved = (id: string) => {
    const s = o.getState().saved.find((x) => x.id === id); if (!s) return;
    const clean = sanitize(s.picks, resolve); o.getState().load(id, { picks: clean.picks });
    setPanel("outfit"); push(clean.dropped.length ? `Opened “${s.name}”. ${clean.dropped.length} item(s) are no longer in the catalog.` : `Opened “${s.name}”`, "success");
  };
  const shareSaved = (s: SavedOutfit) => share(s.avatar, s.picks, s.name);

  const count = Object.keys(picks).length;
  const tabs: { id: PanelId; label: string }[] = [{ id: "items", label: "Items" }, { id: "avatar", label: "Avatar" }, { id: "outfit", label: `Outfit${count ? ` (${count})` : ""}` }, { id: "saved", label: `Saved${mounted && saved.length ? ` (${saved.length})` : ""}` }];

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
      <header className="mb-5 max-w-3xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent-ink">Outfit Studio</p>
        <h1 className="font-display text-headline">Build a look on an avatar</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">Combine real products from the catalog, change colors and sizes, save outfits and add what is available to your cart.</p>
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,31rem)] lg:items-start xl:grid-cols-[minmax(0,1.15fr)_36rem]">
        <section aria-label="Avatar preview" className="min-w-0 sticky top-[7.4rem] z-20 -mx-4 bg-paper px-4 pb-2 pt-1 sm:-mx-6 sm:px-6 lg:top-[7.4rem] lg:mx-0 lg:px-0">
          <div className="relative h-[36svh] min-h-[15rem] overflow-hidden rounded-lg border border-line bg-[#e9e6df] lg:h-[min(calc(100svh-17rem),52rem)]" data-testid="stage">
            {mounted && <AvatarCanvas avatar={avatar} worn={worn} apiRef={api} spin={spin} />}
            <span className="pointer-events-none absolute left-3 top-3 rounded-sm bg-ink/85 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-paper">Preview mode</span>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="Camera">
            {(["front", "back", "left", "right"] as const).map((v) => <button key={v} className={ctl} onClick={() => api.current?.view(v)}>{v === "front" ? "Front" : v === "back" ? "Back" : v === "left" ? "Left side" : "Right side"}</button>)}
            <button className={ctl} onClick={() => api.current?.zoom(0.8)} aria-label="Zoom in">Zoom +</button>
            <button className={ctl} onClick={() => api.current?.zoom(1.25)} aria-label="Zoom out">Zoom −</button>
            <button className={ctl} onClick={() => { setSpin(false); api.current?.reset(); }}>Reset camera</button>
            <button className={cn(ctl, spin && "border-ink bg-ink text-paper")} aria-pressed={spin} onClick={() => setSpin(!spin)}>Rotate</button>
          </div>
          <p className="mt-1 hidden text-xs leading-relaxed text-mute sm:block" data-fit={FIT_QUALITY}>
            <strong className="font-medium text-ink">Preview mode.</strong> Garments are generic shapes fitted to the mannequin and tinted with your chosen color. They do not show the product’s real cut, pattern or how it would fit you, and there is no cloth simulation. Drag to rotate, scroll or pinch to zoom.
          </p>
          <details className="mt-1 text-xs text-mute sm:hidden"><summary className="min-h-8 cursor-pointer">About preview mode</summary><p className="mt-1 leading-relaxed">Garments are generic shapes fitted to the mannequin in your chosen color. They do not show the real product’s cut or fit.</p></details>
        </section>

        <section aria-label="Outfit controls" className="min-w-0">
          <div role="tablist" aria-label="Studio sections" className="mb-4 flex gap-1 border-b border-line">
            {tabs.map((t) => <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={panel === t.id} aria-controls={`pane-${t.id}`} onClick={() => setPanel(t.id)}
              className={cn("min-h-11 flex-1 border-b-2 px-2 text-sm", panel === t.id ? "border-ink font-medium" : "border-transparent text-mute hover:text-ink")}>{t.label}</button>)}
          </div>
          <div role="tabpanel" id={`pane-${panel}`} aria-labelledby={`tab-${panel}`}>
            {panel === "items" && <ItemBrowser items={items} picks={picks} onPick={pickItem} occasion={occasion} />}
            {panel === "avatar" && <AvatarPicker avatar={avatar} onChange={(p) => o.getState().setAvatar(p)} />}
            {panel === "outfit" && (
              <OutfitPanel items={items} resolve={resolve} picks={picks} occasion={occasion} onOccasion={setOccasion} onChange={change} onRemove={(s) => o.getState().setPicks(removeSlot(picks, s))} onUse={useAlt}
                onComplete={complete} onClear={() => o.getState().setPicks({})} onCart={toCart} cartPlan={{ count: cartPlan.lines.length, skipped: cartPlan.skipped }}
                name={mounted ? name : ""} onName={(n) => o.getState().setName(n)} activeSaved={mounted ? active : null} onSave={() => save()} onSaveCopy={() => save(true)} onShare={() => share()}
                onFavorite={() => active && o.getState().toggleFavorite(active.id)} onNew={() => { o.getState().newOutfit(); push("Started a new outfit", "info"); }} />
            )}
            {panel === "saved" && <SavedPanel saved={mounted ? saved : []} activeId={activeId} resolve={resolve} onLoad={loadSaved}
              onRename={(id, n) => { o.getState().rename(id, n); push("Renamed", "success"); }} onDuplicate={(id) => push(o.getState().duplicate(id) ? "Duplicated" : "You can keep up to 50 saved outfits.", "success")}
              onDelete={(id) => { o.getState().remove(id); push("Outfit deleted", "info"); }} onFavorite={(id) => o.getState().toggleFavorite(id)} onShare={shareSaved} />}
          </div>
        </section>
      </div>
    </div>
  );
}
