"use client";
import { CORRIDORS, CORRIDOR_WIDTH, WORLD, ZONES, ZONE_SIZE } from "@/modules/showroom/layout";

const K = 1.1, PAD = 4;
const sx = (x: number) => (x + 30) * K + PAD, sz = (z: number) => (z - WORLD.zMin) * K + PAD;
const W = (WORLD.xMax - WORLD.xMin) * K + PAD * 2, H = (WORLD.zMax - WORLD.zMin) * K + PAD * 2;

/** The mall floor plan (from the mall's own layout data) with one department marked and the way from the entrance. Read-only. */
export function ZoneMap({ zoneId, route, label }: { zoneId: string; route: string[]; label: string }) {
  const size = ZONE_SIZE * K, byName = (n: string) => ZONES.find((z) => z.name === n);
  const pts = route.map(byName).filter((z): z is NonNullable<typeof z> => !!z).map((z) => `${sx(z.center[0]).toFixed(1)},${sz(z.center[1]).toFixed(1)}`).join(" ");
  const entrance = ZONES.find((z) => z.id === "entrance")!;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="mx-auto block w-40 max-w-full" data-testid="zone-map" data-zone={zoneId}>
      {CORRIDORS.map((c) => <rect key={c.id} fill="var(--color-line)" x={sx(c.center[0]) - (c.axis === "x" ? 3 * K : (CORRIDOR_WIDTH * K) / 2)} y={sz(c.center[1]) - (c.axis === "x" ? (CORRIDOR_WIDTH * K) / 2 : 3 * K)} width={c.axis === "x" ? 6 * K : CORRIDOR_WIDTH * K} height={c.axis === "x" ? CORRIDOR_WIDTH * K : 6 * K} />)}
      {ZONES.map((z) => { const here = z.id === zoneId; const x = sx(z.center[0]) - size / 2, y = sz(z.center[1]) - size / 2; return (
        <g key={z.id}><rect x={x} y={y} width={size} height={size} rx={1.5} fill={z.palette.accent} fillOpacity={here ? 0.7 : 0.16} stroke={here ? "var(--color-ink)" : z.palette.accent} strokeWidth={here ? 2.4 : 0.6} />
          <text x={x + size / 2} y={y + size / 2 + 1.4} textAnchor="middle" fontSize={3.6} fill="var(--color-ink)" style={{ fontWeight: here ? 700 : 400 }}>{z.name.split(" ")[0]}</text></g>); })}
      {pts && <polyline points={pts} fill="none" stroke="var(--color-ink)" strokeWidth={1.4} strokeDasharray="3 2" strokeLinecap="round" strokeLinejoin="round" />}
      <circle cx={sx(entrance.center[0])} cy={sz(entrance.center[1])} r={2.4} fill="var(--color-ink)" />
    </svg>
  );
}
