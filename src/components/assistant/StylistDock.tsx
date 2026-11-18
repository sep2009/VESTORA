"use client";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/cn";
import { useMounted } from "@/lib/use-mounted";
import { ZONES } from "@/modules/showroom/layout";
import { useAssistant } from "@/stores/assistant-store";
import { useCameraStore } from "@/stores/camera-store";

const Stylist = dynamic(() => import("./Stylist").then((m) => m.Stylist), { ssr: false, loading: () => <p className="p-4 text-sm text-mute" role="status">Loading the stylist…</p> });
const HIDE = [/^\/assistant/, /^\/admin/, /^\/checkout/];

/** A floating "Ask the stylist" button on shopping pages. It opens a side panel over the page; it never moves the page, the mall camera or anything else by itself. */
export function StylistDock({ productSlugs }: { productSlugs: Record<string, string> }) {
  const mounted = useMounted(), path = usePathname(), sp = useSearchParams();
  const { open, setOpen } = useAssistant();
  const zone = useCameraStore((s) => s.currentZoneId);
  const slugToId = useMemo(() => Object.fromEntries(Object.entries(productSlugs).map(([id, slug]) => [slug, id])), [productSlugs]);
  const productSlug = path.startsWith("/product/") ? path.split("/")[2] ?? null : path === "/" ? sp.get("p") : null;
  const department = sp.get("department") ?? sp.get("dept") ?? (path === "/" && zone ? ZONES.find((z) => z.id === zone)?.department ?? null : null);
  const page = useMemo(() => ({ productId: productSlug ? slugToId[productSlug] ?? null : null, department }), [productSlug, slugToId, department]);
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [open, setOpen]);
  if (!mounted || HIDE.some((r) => r.test(path))) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="stylist-drawer" data-testid="dock-button"
        className={cn("fixed bottom-4 right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-paper shadow-pop hover:bg-ink/90", open && "hidden sm:inline-flex")}>
        <span aria-hidden="true">✦</span>{page.productId ? "Ask about this product" : "Ask the stylist"}
      </button>
      {open && (
        <div id="stylist-drawer" role="dialog" aria-label="Stylist" aria-modal="false" className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line bg-paper p-4 shadow-pop sm:w-[26rem]" data-testid="drawer">
          <div className="mb-2 flex items-center justify-between"><p className="font-display text-lg">Your stylist</p><button className="grid size-10 place-items-center rounded-sm hover:bg-surface" onClick={() => setOpen(false)} aria-label="Close the stylist">✕</button></div>
          <div className="min-h-0 flex-1"><Stylist variant="drawer" page={page} /></div>
        </div>
      )}
    </>
  );
}
