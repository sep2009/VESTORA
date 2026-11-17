"use client";
import { useEffect, useRef, useState } from "react";
import { CORRIDORS, CORRIDOR_WIDTH, DEPARTMENT_ZONES, ZONES, ZONE_SIZE } from "@/modules/showroom/layout";
import { cameraManager } from "@/modules/showroom/camera/manager";
import { selectFocusedZoneId, useCameraStore } from "@/stores/camera-store";
import type { ZoneDef } from "@/modules/showroom/types";
import { cn } from "@/lib/cn";

const K = 1.4; // world metres → map units
const PAD = 4;
const sx = (x: number) => (x + 30) * K + PAD;
const sz = (z: number) => (z + 30) * K + PAD;
const W = 60 * K + PAD * 2;
const H = 78 * K + PAD * 2; // includes the street portal in front of the entrance

function Room({ zone, selected, here, onPick }: { zone: ZoneDef; selected: boolean; here: boolean; onPick: () => void }) {
  const size = ZONE_SIZE * K;
  const x = sx(zone.center[0]) - size / 2, y = sz(zone.center[1]) - size / 2;
  const first = zone.name.split(" ")[0]!;
  return (
    <g role="button" tabIndex={0} aria-label={`Go to ${zone.name}`} aria-pressed={selected} onClick={onPick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(); } }} className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[2.2]">
      <rect x={x} y={y} width={size} height={size} rx={1.5} fill={zone.palette.accent} fillOpacity={here ? 0.55 : 0.28}
        stroke={selected ? "var(--color-ink)" : zone.palette.accent} strokeWidth={selected ? 2.2 : 0.8} />
      <text x={x + size / 2} y={y + size / 2 + 1.4} textAnchor="middle" fontSize={4} fill="var(--color-ink)" style={{ fontWeight: selected ? 700 : 500 }}>{first}</text>
      {selected && <path d={`M${x + 2.5} ${y + 7.5} V${y + 2} l5 2 l-5 2`} fill="var(--color-ink)" stroke="var(--color-ink)" strokeWidth={0.8} />}
    </g>
  );
}

/**
 * Interactive floor plan: every room, the entrance, your position and view direction,
 * and the selected destination. Pick any room to fly there.
 */
export function Minimap() {
  const focusedZone = useCameraStore(selectFocusedZoneId);
  const current = useCameraStore((s) => s.currentZoneId);
  const [open, setOpen] = useState(false);
  const you = useRef<SVGGElement>(null);
  const wedge = useRef<SVGPathElement>(null);

  useEffect(() => cameraManager.onLocation((x, z, az) => {
    you.current?.setAttribute("transform", `translate(${sx(x).toFixed(2)} ${sz(z).toFixed(2)})`);
    // heading of the view direction, measured clockwise from north (up on the map)
    wedge.current?.setAttribute("transform", `rotate(${((Math.atan2(-Math.sin(az), Math.cos(az)) * 180) / Math.PI).toFixed(1)})`);
  }), []);

  const go = (z: ZoneDef) => { cameraManager.focusZone(z.id); setOpen(false); };
  const entrance = ZONES.find((z) => z.id === "entrance")!;
  const ex = sx(entrance.center[0]), ey = sz(entrance.center[1]) + (ZONE_SIZE * K) / 2;

  return (
    <nav aria-label="Showroom map" className="rounded-md border border-line bg-surface/95 p-2 shadow-card backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-1">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="showroom-map-body"
          className="min-h-9 text-[11px] uppercase tracking-[0.2em] text-mute sm:pointer-events-none">Map<span className="sm:hidden"> {open ? "▴" : "▾"}</span></button>
        <button type="button" onClick={() => cameraManager.toOverview()} className="min-h-9 rounded-sm px-2 text-[11px] uppercase tracking-[0.14em] text-mute hover:text-ink">Overview</button>
      </div>
      <div id="showroom-map-body" className={cn("sm:block", open ? "block" : "hidden")}>
        <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Floor plan" className="mx-auto block w-44 max-w-full sm:w-36 lg:w-40 [@media(max-width:639px)]:w-56">
          {CORRIDORS.map((c) => (
            <rect key={c.id} fill="var(--color-line)"
              x={sx(c.center[0]) - (c.axis === "x" ? 3 * K : (CORRIDOR_WIDTH * K) / 2)} y={sz(c.center[1]) - (c.axis === "x" ? (CORRIDOR_WIDTH * K) / 2 : 3 * K)}
              width={c.axis === "x" ? 6 * K : CORRIDOR_WIDTH * K} height={c.axis === "x" ? CORRIDOR_WIDTH * K : 6 * K} />
          ))}
          {ZONES.map((z) => <Room key={z.id} zone={z} selected={focusedZone === z.id} here={current === z.id} onPick={() => go(z)} />)}
          <g aria-hidden="true">
            <rect x={ex - 5} y={ey - 0.6} width={10} height={1.6} fill="var(--color-accent)" />
            <path d={`M${ex - 3} ${ey + 8} L${ex} ${ey + 3.5} L${ex + 3} ${ey + 8}`} fill="none" stroke="var(--color-ink)" strokeWidth={1} />
            <text x={ex} y={ey + 13.5} textAnchor="middle" fontSize={3.8} fill="var(--color-ink)" style={{ fontWeight: 600 }}>ENTRANCE</text>
          </g>
          <g ref={you} aria-hidden="true" transform={`translate(${sx(0)} ${sz(3)})`} style={{ pointerEvents: "none" }}>
            <path ref={wedge} d="M0 0 L-5 -11 A12 12 0 0 1 5 -11 Z" fill="var(--color-ink)" fillOpacity={0.22} />
            <circle r={2.6} fill="var(--color-ink)" stroke="var(--color-surface)" strokeWidth={1} />
          </g>
        </svg>
        <p className="mt-1 flex items-center gap-3 px-1 text-[10px] uppercase tracking-[0.12em] text-mute"><span><span aria-hidden="true">● </span>You</span><span>▌ Destination</span></p>
        <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:hidden">
          {DEPARTMENT_ZONES.map((z) => (
            <li key={z.id}>
              <button type="button" aria-pressed={focusedZone === z.id} onClick={() => go(z)}
                className={cn("flex min-h-12 w-full items-center gap-2 rounded-sm border px-3 text-left text-sm", focusedZone === z.id ? "border-ink bg-ink text-paper" : "border-line")}>
                <span aria-hidden="true" className="size-3 shrink-0 rounded-full border border-black/20" style={{ background: z.palette.accent }} />{z.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
