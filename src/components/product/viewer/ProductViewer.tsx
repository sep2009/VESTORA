"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Object3D } from "three";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { disposeObject, loadModel, type ModelStats } from "./model-loader";
import { applyInspect, PRESETS, type InspectMode, type LightPreset, type ViewerApi, type ViewName } from "./ViewerCanvas";

const ViewerCanvas = dynamic(() => import("./ViewerCanvas"), { ssr: false });

type Status = { kind: "idle" } | { kind: "loading"; loaded: number; total: number | null } | { kind: "ready" } | { kind: "failed"; message: string };

const VIEWS: { id: ViewName; label: string }[] = [{ id: "front", label: "Front" }, { id: "back", label: "Back" }, { id: "left", label: "Left" }, { id: "right", label: "Right" }, { id: "top", label: "Top" }];
const INSPECT: { id: InspectMode; label: string }[] = [{ id: "shaded", label: "Shaded" }, { id: "texture", label: "Texture only" }, { id: "normals", label: "Normals" }, { id: "wireframe", label: "Wireframe" }];
const btn = "min-h-11 min-w-11 rounded-sm border border-line bg-surface/95 px-2.5 text-[11px] uppercase tracking-[0.12em] hover:border-ink aria-pressed:bg-ink aria-pressed:text-paper sm:min-h-9";
const mb = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

/**
 * Interactive viewer for a product's real GLB/GLTF. It never draws anything that is not the model file:
 * if the file is missing, invalid or too heavy, `onUnavailable` is called with the reason so the page shows its photo gallery instead.
 */
export function ProductViewer({ url, name, onUnavailable, license }: { url: string; name: string; onUnavailable: (reason: string) => void; license: string | null }) {
  const wrap = useRef<HTMLDivElement>(null);
  const api = useRef<ViewerApi | null>(null);
  const reduced = useReducedMotion();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [model, setModel] = useState<{ root: Object3D; stats: ModelStats } | null>(null);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [preset, setPreset] = useState<LightPreset>("studio");
  const [inspect, setInspect] = useState<InspectMode>("shaded");
  const [auto, setAuto] = useState(false);
  const [full, setFull] = useState(false);
  const [info, setInfo] = useState(false);
  const modelRef = useRef<Object3D | null>(null);

  // Load lazily: only once the viewer is on screen. No model bytes are fetched before that.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    const vis = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const started = useRef(false);
  useEffect(() => {
    if (!visible || started.current) return;
    started.current = true;
    const fail = (message: string) => { setStatus({ kind: "failed", message }); onUnavailable(message); };
    const canvas = document.createElement("canvas");
    if (!canvas.getContext("webgl2") && !canvas.getContext("webgl")) return fail("This browser cannot show 3D (WebGL is unavailable).");
    const ctl = new AbortController();
    setStatus({ kind: "loading", loaded: 0, total: null });
    loadModel(url, (loaded, total) => setStatus({ kind: "loading", loaded, total }), ctl.signal).then(
      (m) => { if (ctl.signal.aborted) return disposeObject(m.root); modelRef.current = m.root; setModel(m); setStatus({ kind: "ready" }); },
      (e: Error) => { if (!ctl.signal.aborted) fail(e.message); },
    );
    return () => { ctl.abort(); started.current = false; };
    // url is the identity of the model; onUnavailable is intentionally not a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, url]);

  // Free GPU memory when the viewer goes away.
  useEffect(() => () => { const r = modelRef.current; if (r) { applyInspect(r, "shaded"); disposeObject(r); modelRef.current = null; } }, []);

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === wrap.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggleFull = useCallback(async () => {
    const el = wrap.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el.requestFullscreen) await el.requestFullscreen();
      else setFull((f) => !f); // iPhone Safari has no element fullscreen: fill the screen with CSS instead
    } catch { setFull((f) => !f); }
  }, []);
  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.fullscreenElement) setFull(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [full]);

  const onKey = (e: React.KeyboardEvent) => {
    const a = api.current, s = 0.2;
    if (!a) return;
    const m: Record<string, () => void> = { ArrowLeft: () => a.rotate(s, 0), ArrowRight: () => a.rotate(-s, 0), ArrowUp: () => a.rotate(0, s), ArrowDown: () => a.rotate(0, -s), "+": () => a.zoom(0.8), "=": () => a.zoom(0.8), "-": () => a.zoom(1.25), "0": () => a.reset() };
    const f = m[e.key];
    if (f) { e.preventDefault(); f(); }
  };
  // Wheel scrolls the page; Ctrl/Cmd+wheel (and a trackpad pinch) zooms the model.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const w = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey) e.stopPropagation(); else e.preventDefault(); };
    el.addEventListener("wheel", w, { capture: true, passive: false });
    return () => el.removeEventListener("wheel", w, { capture: true });
  }, []);

  const pct = status.kind === "loading" && status.total ? Math.round((status.loaded / status.total) * 100) : null;
  const ready = status.kind === "ready" && model;
  const toolbar = (
    <div className="space-y-2 bg-surface p-2">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Camera views">{VIEWS.map((v) => <button key={v.id} type="button" className={btn} onClick={() => api.current?.view(v.id)}>{v.label}</button>)}
        <button type="button" className={btn} aria-label="Zoom in" onClick={() => api.current?.zoom(0.8)}>+</button>
        <button type="button" className={btn} aria-label="Zoom out" onClick={() => api.current?.zoom(1.25)}>−</button>
        <button type="button" className={btn} onClick={() => api.current?.reset()}>Reset</button>
      </div>
      <div className="flex flex-wrap gap-1">
        <label className="sr-only" htmlFor="pv-light">Lighting</label>
        <select id="pv-light" value={preset} onChange={(e) => setPreset(e.target.value as LightPreset)} className={cn(btn, "appearance-none")}>{(Object.keys(PRESETS) as LightPreset[]).map((k) => <option key={k} value={k}>Light: {PRESETS[k].label}</option>)}</select>
        <label className="sr-only" htmlFor="pv-inspect">Inspect</label>
        <select id="pv-inspect" value={inspect} onChange={(e) => setInspect(e.target.value as InspectMode)} className={cn(btn, "appearance-none")}>{INSPECT.map((i) => <option key={i.id} value={i.id}>Inspect: {i.label}</option>)}</select>
        <button type="button" className={btn} aria-pressed={auto} onClick={() => setAuto((a) => !a)} disabled={reduced} title={reduced ? "Turned off by your reduced-motion setting" : undefined}>Spin</button>
        <button type="button" className={btn} aria-pressed={info} onClick={() => setInfo((i) => !i)}>Details</button>
        <button type="button" className={btn} aria-pressed={full} onClick={() => void toggleFull()}>{full ? "Exit full screen" : "Full screen"}</button>
      </div>
    </div>
  );
  return (
    <div ref={wrap} tabIndex={0} onKeyDown={onKey} role="group" aria-label={`Interactive 3D model of ${name}`}
      className={cn("flex flex-col overflow-hidden rounded-sm outline-offset-2", full ? "fixed inset-0 z-[80] rounded-none bg-surface" : "w-full")}>
      <div className={cn("relative min-h-0", full ? "flex-1" : "aspect-[4/5] max-h-[70svh]")} style={{ background: PRESETS[preset].bg, touchAction: "none" }}>
        {ready && <div className="absolute inset-0"><ViewerCanvas root={model.root} preset={preset} inspect={inspect} autoRotate={auto} apiRef={api} active={visible && pageVisible} reduced={reduced} /></div>}
        {status.kind === "loading" && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center" role="status" aria-live="polite">
            <div className="w-56 max-w-full space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-mute">Loading 3D model{status.loaded > 0 ? ` · ${mb(status.loaded)}` : ""}</p>
              <div className="h-1 overflow-hidden rounded-full bg-ink/15" role="progressbar" aria-label="3D model download progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
                <div className={cn("h-full bg-ink transition-[width]", pct === null && "w-1/3 animate-pulse")} style={pct === null ? undefined : { width: `${pct}%` }} />
              </div>
              {pct !== null && <p className="text-xs text-mute">{pct}%</p>}
            </div>
          </div>
        )}
        {status.kind === "idle" && <div className="absolute inset-0 grid place-items-center text-xs uppercase tracking-[0.2em] text-mute">3D view loads when visible</div>}
        {ready && <p className="pointer-events-none absolute top-2 left-2 max-w-[calc(100%-1rem)] rounded-sm bg-surface/85 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-mute">Drag to rotate · pinch or Ctrl + scroll to zoom · two fingers or right-drag to pan</p>}
        {ready && info && (
          <div className="absolute right-2 bottom-2 max-h-[70%] w-72 max-w-[calc(100%-1rem)] overflow-auto rounded-sm border border-line bg-surface/95 p-3 text-xs shadow-pop" role="region" aria-label="Model details">
            <p className="mb-1 font-medium uppercase tracking-[0.14em]">Model</p>
            <p className="text-mute">{model.stats.triangles.toLocaleString()} triangles · {model.stats.meshes} meshes · {model.stats.materials} materials{model.stats.bytes ? ` · ${mb(model.stats.bytes)}` : ""}</p>
            <p className="mt-2 mb-1 font-medium uppercase tracking-[0.14em]">Textures ({model.stats.textures.length})</p>
            {model.stats.textures.length === 0 ? <p className="text-mute">No image textures (plain material colors).</p> : <ul className="space-y-0.5 text-mute">{model.stats.textures.map((t, i) => <li key={i}>{t.name}: {t.width}×{t.height}</li>)}</ul>}
            {license && <p className="mt-2 text-mute">Model licence: {license}</p>}
            <p className="mt-2 text-mute">Inspect &gt; Texture only shows the base-color map without lighting. Zoom in to check the weave and print.</p>
          </div>
        )}
        {status.kind === "failed" && <p role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-mute">{status.message}</p>}
      </div>
      {ready && toolbar}
    </div>
  );
}
