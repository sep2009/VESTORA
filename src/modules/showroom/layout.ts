import type { ZoneDef, ZoneId, ZonePalette } from "./types";

/** World units are metres. Zones are square cells on a 3x3 grid joined by corridors. */
export const ZONE_SIZE = 16;
export const GRID_SPACING = 22;
export const CORRIDOR_LENGTH = GRID_SPACING - ZONE_SIZE; // 6
export const CORRIDOR_WIDTH = 4.5;
export const DOOR_WIDTH = CORRIDOR_WIDTH;
export const WALL_HEIGHT = 5.5;
export const CUTAWAY_HEIGHT = 1.1; // south and east walls are cut low so the interior reads from the camera
export const WALL_THICKNESS = 0.4;

const P = (p: ZonePalette) => p;

const zone = (
  id: ZoneId, department: ZoneDef["department"], name: string, tagline: string,
  col: ZoneDef["col"], row: ZoneDef["row"], palette: ZonePalette,
): ZoneDef => ({ id, department, name, tagline, col, row, center: [col * GRID_SPACING, row * GRID_SPACING], palette });

export const ZONES: readonly ZoneDef[] = [
  zone("formal", "formal", "Formal", "Tailoring and eveningwear", -1, -1,
    P({ floor: "#6d4d33", floorLine: "", floorKind: "parquet", wall: "#232b3d", trim: "#b08d57", accent: "#6f2230", accent2: "#b08d57", light: "#ffe4c0", lightIntensity: 1 })),
  zone("luxury", "luxury", "Luxury", "Craft, marble and brass", 0, -1,
    P({ floor: "#ece9e2", floorLine: "", floorKind: "marble", wall: "#2c3b34", trim: "#b08d57", accent: "#b08d57", accent2: "#5a2a30", light: "#ffe1b5", lightIntensity: 1.1 })),
  zone("denim", "denim", "Denim", "Indigo, selvedge and copper", 1, -1,
    P({ floor: "#8f6f4c", floorLine: "", floorKind: "oak", wall: "#2a3850", trim: "#7a5a3a", accent: "#c78a4a", accent2: "#d9d2c3", light: "#ffe3bb", lightIntensity: 1 })),
  zone("sportswear", "sportswear", "Sportswear", "Performance and training", -1, 0,
    P({ floor: "#d6d9da", floorLine: "", floorKind: "limestone", wall: "#eceff0", trim: "#33383d", accent: "#3d72b4", accent2: "#9aa3aa", light: "#f2f7ff", lightIntensity: 1 })),
  zone("new-arrivals", "new-arrivals", "New Arrivals", "Just in this season", 0, 0,
    P({ floor: "#e8e4db", floorLine: "", floorKind: "terrazzo", wall: "#f0ede7", trim: "#b08d57", accent: "#c4602b", accent2: "#1f1f20", light: "#fff4e2", lightIntensity: 1 })),
  zone("streetwear", "streetwear", "Streetwear", "Concrete, steel and graphics", 1, 0,
    P({ floor: "#74736f", floorLine: "", floorKind: "concrete", wall: "#2d2d2f", trim: "#17171a", accent: "#c8cd72", accent2: "#9b3b32", light: "#e9e4f3", lightIntensity: 1 })),
  zone("accessories", "accessories", "Accessories", "Bags, watches, eyewear", -1, 1,
    P({ floor: "#cdd2cf", floorLine: "", floorKind: "limestone", wall: "#3b5254", trim: "#b08d57", accent: "#c9a15a", accent2: "#e8eeee", light: "#f3fbff", lightIntensity: 1 })),
  zone("sneakers", "sneakers", "Sneakers", "A gallery for footwear", 0, 1,
    P({ floor: "#8a8985", floorLine: "", floorKind: "concrete", wall: "#222427", trim: "#101012", accent: "#e7dcc2", accent2: "#b5483a", light: "#fff0dc", lightIntensity: 1 })),
  zone("casual", "casual", "Casual", "Everyday, easy, comfortable", 1, 1,
    P({ floor: "#d2b48c", floorLine: "", floorKind: "oak", wall: "#e5d9c6", trim: "#8a6b48", accent: "#6f8b6c", accent2: "#c08a52", light: "#ffe0b5", lightIntensity: 1 })),
  zone("entrance", null, "Entrance", "Welcome to Vestora", 0, 2,
    P({ floor: "#d3c8b4", floorLine: "", floorKind: "travertine", wall: "#ece8e0", trim: "#1c1c1d", accent: "#b9582b", accent2: "#1c1c1d", light: "#fff3e0", lightIntensity: 1 })),
];

export const DEPARTMENT_ZONES = ZONES.filter((z) => z.department !== null);

/**
 * Department names/taglines are editable in the admin. Rooms are fixed, so only their labels change.
 * Called with the database values on the server and again on the client before anything renders.
 */
export function applyDepartmentMeta(meta: readonly { slug: string; name: string; tagline: string }[]) {
  for (const m of meta) {
    const z = ZONES.find((x) => x.department === m.slug) as { name: string; tagline: string } | undefined;
    if (z) { z.name = m.name; z.tagline = m.tagline || z.tagline; }
  }
}

export function getZone(id: ZoneId): ZoneDef {
  const z = ZONES.find((x) => x.id === id);
  if (!z) throw new Error(`Unknown zone ${id}`);
  return z;
}

export function zoneByDepartment(slug: string): ZoneDef | undefined {
  return ZONES.find((z) => z.department === slug);
}

export type Side = "n" | "s" | "e" | "w";
export type Openings = Record<Side, boolean>;

const at = (col: number, row: number) => ZONES.find((z) => z.col === col && z.row === row);

/** Which sides of a zone connect to a neighbour. The entrance's south side opens to the street. */
export function openingsFor(z: ZoneDef): Openings {
  return {
    n: !!at(z.col, z.row - 1), s: !!at(z.col, z.row + 1) || z.id === "entrance",
    e: !!at(z.col + 1, z.row), w: !!at(z.col - 1, z.row),
  };
}

export type CorridorDef = { id: string; axis: "x" | "z"; center: readonly [number, number]; a: ZoneDef; b: ZoneDef };

/** One corridor between every pair of adjacent zones. For axis x: a is west of b. For axis z: a is north of b. */
export const CORRIDORS: readonly CorridorDef[] = ZONES.flatMap((a) => {
  const out: CorridorDef[] = [];
  const east = at(a.col + 1, a.row);
  const south = at(a.col, a.row + 1);
  if (east) out.push({ id: `${a.id}-${east.id}`, axis: "x", center: [(a.center[0] + east.center[0]) / 2, a.center[1]], a, b: east });
  if (south) out.push({ id: `${a.id}-${south.id}`, axis: "z", center: [a.center[0], (a.center[1] + south.center[1]) / 2], a, b: south });
  return out;
});

/** World bounds (metres) used by the base slab, minimap and camera framing. z includes the street portal in front of the entrance. */
export const WORLD = { xMin: -30, xMax: 30, zMin: -30, zMax: 62 } as const;
