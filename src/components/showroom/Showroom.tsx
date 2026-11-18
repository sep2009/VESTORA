"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { applyDepartmentMeta, zoneByDepartment } from "@/modules/showroom/layout";
import type { ResolvedDisplay } from "@/modules/showroom/types";
import { cameraManager } from "@/modules/showroom/camera/manager";
import { useCameraStore } from "@/stores/camera-store";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { detectQuality, useQuality } from "@/stores/quality-store";
import { Button } from "@/components/ui/Button";
import { DestinationBanner } from "./DestinationBanner";
import { DisplayInfo } from "./DisplayInfo";
import { GuidedProgress } from "./GuidedProgress";
import { GuidedTrack } from "./GuidedTrack";
import { Minimap } from "./Minimap";
import { ModeSwitch } from "./ModeSwitch";
import { ProductSheet } from "./ProductSheet";
import { ShowroomLoader } from "./ShowroomLoader";

const ShowroomScene = dynamic(() => import("./ShowroomScene"), { ssr: false, loading: () => <ShowroomLoader /> });

const HINTS = {
  guided: "Scroll to tour the mall · switch to Explore to take control",
  explore: "Drag to look · Ctrl + scroll or pinch to zoom · arrow keys · click a display",
  focus: "Drag to look around · Esc or Return to go back",
} as const;

export default function Showroom({ displays, departments }: { displays: ResolvedDisplay[]; departments: { slug: string; name: string; tagline: string }[] }) {
  // Editable department names are applied before anything renders (idempotent).
  applyDepartmentMeta(departments);
  const products = useMemo(() => displays.flatMap((d) => d.products), [displays]);
  const mode = useCameraStore((s) => s.mode);
  const stops = useCameraStore((s) => s.guided.count);
  const depth = useCameraStore((s) => s.backDepth);
  const reduced = useReducedMotion();
  const quality = useQuality((s) => s.level);
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  // The sticky site header is taller than a fixed number (it has a department strip), so the stage measures it. A wrong offset hid the top of the scene under the header.
  const [hh, setHh] = useState(118);
  useEffect(() => {
    const el = document.querySelector("header");
    if (!el) return;
    const read = () => setHh(Math.round(el.getBoundingClientRect().height));
    read(); const ro = new ResizeObserver(read); ro.observe(el); window.addEventListener("resize", read);
    return () => { ro.disconnect(); window.removeEventListener("resize", read); };
  }, []);

  // Weak and touch-first devices start in Lite; the visitor can switch, and a slow frame rate also drops to Lite.
  useEffect(() => { useQuality.getState().set(detectQuality()); }, []);

  // Start in guided mode, or explore when the visitor prefers reduced motion. Reset when leaving the page.
  useEffect(() => {
    // Phones and reduced-motion visitors start in Explore: a long scroll tour is a poor default there.
    cameraManager.setMode(reduced || window.innerWidth < 768 ? "explore" : "guided");
    return () => { cameraManager.setMode("explore"); };
  }, [reduced]);

  // Deep links from the shop and search: /?p=<product slug> opens that exact product, /?dept=<department> flies to it.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const slug = sp.get("p"), dept = sp.get("dept");
    const product = slug ? products.find((x) => x.slug === slug) : undefined;
    const zone = dept ? zoneByDepartment(dept) : undefined;
    if (!product && !zone) return;
    cameraManager.setMode("explore");
    cameraManager.whenReady(() => {
      if (product && cameraManager.hasProduct(product.id)) cameraManager.focusProduct(product.id);
      else if (zone) cameraManager.focusZone(zone.id);
    });
    // runs once per mount; the URL is the source of truth for the initial target
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wheel/trackpad scrolling over the scene must scroll the page; only Ctrl/Cmd+wheel (and pinch) zooms.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey) e.stopPropagation(); };
    el.addEventListener("wheel", onWheel, { capture: true, passive: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  // Leaving guided mode collapses the tall scroll track; bring the scene back into view so the page does not jump away.
  const prev = useRef(mode);
  useEffect(() => {
    if (prev.current === "guided" && mode !== "guided") stage.current?.scrollIntoView({ block: "start", behavior: "auto" });
    prev.current = mode;
  }, [mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && useCameraStore.getState().mode === "focus") cameraManager.back(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const keyDown = (e: React.KeyboardEvent) => {
    if (useCameraStore.getState().mode === "guided") return; // arrows keep scrolling the page
    if (e.key.startsWith("Arrow") || e.key === "+" || e.key === "-" || e.key === "=" || e.key === "_") { e.preventDefault(); cameraManager.keys.add(e.key); }
    if (e.key === "Home") { e.preventDefault(); cameraManager.toOverview(); }
  };
  const keyUp = (e: React.KeyboardEvent) => { cameraManager.keys.delete(e.key); };

  return (
    <div ref={track} style={mode === "guided" ? { height: `calc(100svh - ${hh + 16}px + ${(stops - 1) * 58}svh)` } : undefined}>
      <GuidedTrack track={track} active={mode === "guided"} top={hh} />
      <div
        ref={stage} style={{ top: hh + 4, height: `calc(100svh - ${hh + 16}px)`, scrollMarginTop: hh + 4 }} tabIndex={0} role="region" aria-label="3D showroom. Use the mode buttons and map, or the arrow keys, to move around."
        onKeyDown={keyDown} onKeyUp={keyUp} onBlur={() => cameraManager.keys.clear()}
        className="sticky min-h-[26rem] overflow-hidden rounded-lg border border-line"
      >
        <ShowroomScene displays={displays} />
        <div className="absolute top-3 left-3"><Minimap /></div>
        <p className="pointer-events-none absolute top-3 right-3 hidden max-w-sm rounded-sm bg-surface/90 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-mute lg:block">{HINTS[mode]}</p>
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col items-start gap-2 [&>*]:pointer-events-auto">
          <DestinationBanner />
          <DisplayInfo displays={displays} />
          <div className="flex flex-wrap items-center gap-2">
            <ModeSwitch />
            {mode === "guided" && <GuidedProgress />}
            {mode !== "guided" && depth > 0 && <Button size="sm" variant="secondary" className="min-h-11 bg-surface/95 sm:min-h-9" onClick={() => cameraManager.back()}>← Back</Button>}
            <button type="button" aria-pressed={quality === "lite"} onClick={() => useQuality.getState().set(quality === "high" ? "lite" : "high", true)}
              title="Lite mode turns off post-processing and softens shadows for smoother performance"
              className="min-h-11 rounded-sm border border-line bg-surface/95 px-3 text-[11px] uppercase tracking-[0.14em] text-mute hover:text-ink sm:min-h-9">
              {quality === "high" ? "Quality: High" : "Quality: Lite"}
            </button>
            {mode === "explore" && (
              <div className="flex gap-1" role="group" aria-label="Zoom">
                <button type="button" onClick={() => cameraManager.zoom(0.8)} aria-label="Zoom in" className="grid size-11 place-items-center rounded-sm border border-line bg-surface/95 text-lg sm:size-9">+</button>
                <button type="button" onClick={() => cameraManager.zoom(1.25)} aria-label="Zoom out" className="grid size-11 place-items-center rounded-sm border border-line bg-surface/95 text-lg sm:size-9">−</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <ProductSheet />
    </div>
  );
}
