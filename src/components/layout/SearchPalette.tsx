"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Dialog";
import { Label } from "@/components/product/ProductLabel";
import { DEPARTMENT_LABEL } from "@/modules/catalog/kinds";
import { matchScore } from "@/modules/catalog/query";
import { formatMoney } from "@/lib/money";
import { cameraManager } from "@/modules/showroom/camera/manager";
import { zoneByDepartment } from "@/modules/showroom/layout";
import type { IndexItem } from "@/server/catalog/index-data";

type Brand = { slug: string; name: string; demo: boolean; department: string | null; count: number };
type Data = { items: IndexItem[]; brands: Brand[] };
let cache: Promise<Data> | null = null;
const load = () => (cache ??= fetch("/api/catalog").then((r) => r.json() as Promise<Data>).catch(() => { cache = null; return { items: [], brands: [] }; }));

/**
 * Search for a product or a brand in the one catalog. Every product result can open its product page and, when a
 * display for it exists, jump straight to it in the 3D mall.
 */
export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open && !data) void load().then(setData); }, [open, data]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    if (!data || !q.trim()) return { products: [] as IndexItem[], brands: [] as Brand[] };
    const products = data.items.map((p) => ({ p, s: matchScore(p, p.brandName, q) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.p);
    const brands = data.brands.filter((b) => matchScore({ name: b.name, category: "", department: "" }, "", q) > 0).slice(0, 4);
    return { products, brands };
  }, [data, q]);

  const close = () => setOpen(false);
  /** Jump straight to a department; flies there if the mall is on screen, otherwise opens the mall at that department. */
  const gotoDept = (dept: string) => {
    close();
    const zone = zoneByDepartment(dept);
    if (window.location.pathname === "/" && zone) { cameraManager.setMode("explore"); cameraManager.focusZone(zone.id); } else router.push(`/?dept=${dept}`);
  };
  const gotoProduct = (slug: string, id: string) => {
    close();
    if (window.location.pathname === "/" && cameraManager.hasProduct(id)) { cameraManager.setMode("explore"); cameraManager.focusProduct(id); } else router.push(`/?p=${slug}`);
  };
  const row = "flex items-center justify-between gap-3 rounded-sm px-2 py-2 hover:bg-ink/6";
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Search brands and products (Ctrl or Cmd K)" className="grid size-11 place-items-center rounded-sm hover:bg-ink/8"><Icon name="search" /></button>
      <Modal open={open} onClose={close} label="Search">
        <form role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) { close(); router.push(`/shop?q=${encodeURIComponent(q.trim())}`); } }} className="space-y-4">
          <label htmlFor="site-search" className="sr-only">Search brands and products</label>
          <input id="site-search" ref={input} autoFocus value={q} onChange={(e) => setQ(e.target.value)} type="search" autoComplete="off" placeholder="Search brands and products"
            className="h-12 w-full rounded-sm border border-line bg-paper px-4 text-base placeholder:text-mute" />
          <div aria-live="polite" className="max-h-[50vh] space-y-4 overflow-y-auto">
            {q.trim() && data && results.brands.length === 0 && results.products.length === 0 && <p className="text-sm text-mute">No brands or products match “{q}”.</p>}
            {results.brands.length > 0 && (
              <section><h3 className="mb-1 text-[11px] uppercase tracking-[0.2em] text-mute">Brands</h3>
                <ul>{results.brands.map((b) => (
                  <li key={b.slug} className={row}>
                    <span>{b.name} <span className="text-xs text-mute">· {b.count}</span> {b.demo && <Label>Demo</Label>}</span>
                    <span className="flex gap-3 text-xs uppercase tracking-[0.12em]">
                      <Link href={`/shop?brand=${b.slug}`} onClick={close} className="underline">Browse</Link>
                      {b.department && <button type="button" onClick={() => gotoDept(b.department!)} className="underline">In mall: {DEPARTMENT_LABEL[b.department]}</button>}
                    </span>
                  </li>))}</ul></section>
            )}
            {results.products.length > 0 && (
              <section><h3 className="mb-1 text-[11px] uppercase tracking-[0.2em] text-mute">Products</h3>
                <ul>{results.products.map((p) => (
                  <li key={p.id} className={row}>
                    <Link href={`/product/${p.slug}`} onClick={close} className="min-w-0 flex-1"><span className="block truncate">{p.name}</span><span className="text-xs text-mute">{p.brandName}{p.price ? ` · ${formatMoney(p.price)}` : ""}{p.demo ? " · demo" : ""}</span></Link>
                    {p.inMall ? <button type="button" onClick={() => gotoProduct(p.slug, p.id)} className="shrink-0 text-xs uppercase tracking-[0.12em] underline">Show in mall</button> : <span className="shrink-0 text-xs text-mute">Shop only</span>}
                  </li>))}</ul></section>
            )}
          </div>
          <p className="text-xs text-mute">Press Enter to see every result in the shop.</p>
        </form>
      </Modal>
    </>
  );
}
