import "server-only";
import { CORRIDORS, ZONES, zoneByDepartment } from "@/modules/showroom/layout";
import type { ZoneId } from "@/modules/showroom/types";

/** Where a department really is in the 3D mall, read from the mall's own layout data (rooms on a grid joined by corridors). */
export type DeptLocation = { zoneId: ZoneId; name: string; col: number; row: number; center: [number, number]; position: string; route: string[]; steps: string; neighbors: { direction: string; name: string }[] };
const NAME = (id: string) => ZONES.find((z) => z.id === id)!.name;

export function locateDepartment(slug: string): DeptLocation | null {
  const z = zoneByDepartment(slug); if (!z) return null;
  const adj = new Map<string, string[]>(); for (const c of CORRIDORS) { adj.set(c.a.id, [...(adj.get(c.a.id) ?? []), c.b.id]); adj.set(c.b.id, [...(adj.get(c.b.id) ?? []), c.a.id]); }
  const prev = new Map<string, string | null>([["entrance", null]]); const q = ["entrance"];
  while (q.length) { const cur = q.shift()!; for (const n of adj.get(cur) ?? []) if (!prev.has(n)) { prev.set(n, cur); q.push(n); } }
  const path: string[] = []; for (let c: string | null | undefined = z.id; c; c = prev.get(c)) path.unshift(c);
  const route = path.map(NAME);
  const ns = ZONES.flatMap((o) => { const dc = o.col - z.col, dr = o.row - z.row; if (Math.abs(dc) + Math.abs(dr) !== 1 || !(adj.get(z.id) ?? []).includes(o.id)) return []; return [{ direction: dr < 0 ? "north" : dr > 0 ? "south" : dc < 0 ? "west" : "east", name: o.name }]; });
  const v = z.row < 0 ? "north" : z.row > 1 ? "south" : z.row === 1 ? "south" : "middle", h = z.col < 0 ? "west" : z.col > 0 ? "east" : "center";
  const position = z.id === "entrance" ? "at the front of the mall, where you come in" : v === "middle" && h === "center" ? "in the middle of the mall" : v === "middle" ? `on the ${h} side of the mall` : h === "center" ? `at the ${v} of the mall` : `in the ${v}-${h} part of the mall`;
  const steps = route.length <= 1 ? "You start here." : `From the entrance go through ${route.slice(1, -1).length ? route.slice(1, -1).join(", then ") + ", then " : ""}continue to ${z.name}.`;
  return { zoneId: z.id, name: z.name, col: z.col, row: z.row, center: [z.center[0], z.center[1]], position, route, steps, neighbors: ns };
}
