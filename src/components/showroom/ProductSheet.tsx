"use client";
import { useEffect, useRef, useState } from "react";
import type { ProductDetail } from "@/server/catalog/detail";
import { ProductDetailView } from "@/components/product/ProductDetailView";
import { Icon } from "@/components/ui/Icon";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useDetailSheet } from "@/stores/detail-sheet";

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; data: ProductDetail };

/**
 * Full product experience opened from a 3D display. It expands from the object's place on screen (the camera has already
 * flown to it and centred it), keeps the mall mounted underneath, and closing returns to that exact showroom state.
 * Browser Back and Esc close it.
 */
export function ProductSheet() {
  const slug = useDetailSheet((s) => s.slug);
  const close = useDetailSheet((s) => s.close);
  const reduced = useReducedMotion();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const pushed = useRef(false);

  // Fetch the same record the product page uses.
  useEffect(() => {
    if (!slug) return;
    setLoad({ state: "loading" });
    const ctl = new AbortController();
    fetch(`/api/products/${encodeURIComponent(slug)}`, { signal: ctl.signal })
      .then(async (r) => (r.ok ? (await r.json()) as ProductDetail : Promise.reject(new Error(r.status === 404 ? "This product is no longer in the catalog." : "Could not load the product."))))
      .then((data) => setLoad({ state: "ready", data }))
      .catch((e: Error) => { if (e.name !== "AbortError") setLoad({ state: "error", message: e.message }); });
    return () => ctl.abort();
  }, [slug]);

  const isOpen = slug !== null;
  // History entry so the phone's Back button closes the sheet instead of leaving the mall.
  useEffect(() => {
    if (!isOpen || pushed.current) return;
    pushed.current = true;
    window.history.pushState({ ...(window.history.state ?? {}), vestoraSheet: true }, "");
    const pop = () => { pushed.current = false; close(); };
    window.addEventListener("popstate", pop, { once: true });
    return () => window.removeEventListener("popstate", pop);
  }, [isOpen, close]);
  const closeSheet = () => { if (pushed.current) { pushed.current = false; window.history.back(); } else close(); };

  // Focus management, scroll lock, Esc.
  useEffect(() => {
    if (!isOpen) return;
    opener.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) { e.stopImmediatePropagation(); closeSheet(); }
      if (e.key === "Tab" && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),select,input,[tabindex='0']")].filter((x) => x.offsetParent !== null);
        if (f.length === 0) return;
        const first = f[0]!, last = f[f.length - 1]!;
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      document.body.style.overflow = prevOverflow;
      (opener.current as HTMLElement | null)?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Product details" data-testid="product-sheet">
      <button type="button" aria-label="Close product details" tabIndex={-1} onClick={closeSheet} className="absolute inset-0 bg-ink/50 backdrop-blur-sm" style={reduced ? undefined : { animation: "sheet-fade 240ms ease-out both" }} />
      <div ref={panel} tabIndex={-1} className="absolute inset-x-0 bottom-0 top-0 overflow-y-auto overscroll-contain bg-paper outline-none sm:inset-x-4 sm:top-4 sm:rounded-t-lg lg:inset-x-10"
        style={reduced ? undefined : { animation: "sheet-in 380ms cubic-bezier(.2,.8,.2,1) both", transformOrigin: "35% 55%" }}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 py-2 backdrop-blur sm:px-6">
          <button type="button" onClick={closeSheet} className="inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.16em] hover:text-accent-ink"><span aria-hidden="true">←</span> Back to the showroom</button>
          <button type="button" onClick={closeSheet} aria-label="Close product details" className="grid size-11 place-items-center rounded-sm hover:bg-ink/8"><Icon name="close" size={18} /></button>
        </div>
        <div className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6 sm:py-10">
          {load.state === "loading" && <p role="status" className="py-24 text-center text-xs uppercase tracking-[0.2em] text-mute">Loading product…</p>}
          {load.state === "error" && <p role="alert" className="py-24 text-center text-sm text-mute">{load.message}</p>}
          {load.state === "ready" && <ProductDetailView key={load.data.product.id} data={load.data} variant="sheet" onShowInMall={closeSheet} />}
        </div>
      </div>
    </div>
  );
}
