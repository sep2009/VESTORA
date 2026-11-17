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
  zone("minimal", "minimal", "Minimal", "Clean lines, quiet colour", -1, -1,
    P({ floor: "#e9e7e2", floorLine: "#d3d0c9", floorKind: "plain", wall: "#f1f0ec", trim: "#2b2b2b", accent: "#2b2b2b", accent2: "#9a9a96", light: "#ffffff", lightIntensity: 1 })),
  zone("formal", "formal", "Formal", "Tailoring and eveningwear", 0, -1,
    P({ floor: "#6e4c31", floorLine: "#573b26", floorKind: "parquet", wall: "#1d2438", trim: "#b8a46a", accent: "#8c1f2e", accent2: "#b8a46a", light: "#ffe7c4", lightIntensity: 1 })),
  zone("casual", "casual", "Casual", "Everyday, easy, comfortable", 1, -1,
    P({ floor: "#b98b5e", floorLine: "#a07548", floorKind: "planks", wall: "#eadcc4", trim: "#7a5a3a", accent: "#5f9c6d", accent2: "#e0a458", light: "#ffd9a0", lightIntensity: 1 })),
  zone("luxury", "luxury", "Luxury", "Craft, marble and gold", -1, 0,
    P({ floor: "#ded7c8", floorLine: "#b9b09b", floorKind: "tiles", wall: "#20392f", trim: "#c9a24a", accent: "#c9a24a", accent2: "#6b1f2a", light: "#ffe2b0", lightIntensity: 1.1 })),
  zone("new-arrivals", "new-arrivals", "New Arrivals", "Just in this season", 0, 0,
    P({ floor: "#ece8e0", floorLine: "#d5d0c4", floorKind: "rings", wall: "#f6f4ef", trim: "#ff5a1f", accent: "#ff5a1f", accent2: "#121212", light: "#ffffff", lightIntensity: 1 })),
  zone("streetwear", "streetwear", "Streetwear", "Concrete, colour and sneakers", 1, 0,
    P({ floor: "#3b3b3f", floorLine: "#2a2a2d", floorKind: "concrete", wall: "#2a2a2f", trim: "#d6ff3d", accent: "#d6ff3d", accent2: "#ff3d81", light: "#c3b0ff", lightIntensity: 1 })),
  zone("accessories", "accessories", "Accessories", "Shoes, bags, watches, eyewear", -1, 1,
    P({ floor: "#cdd9d8", floorLine: "#b4c4c3", floorKind: "tiles", wall: "#2f5058", trim: "#e0b24a", accent: "#e0b24a", accent2: "#e8f4f4", light: "#e6fbff", lightIntensity: 1 })),
  zone("entrance", null, "Entrance", "Welcome to Vestora", 0, 1,
    P({ floor: "#d8d3c9", floorLine: "#c3bdb0", floorKind: "plain", wall: "#efece6", trim: "#121212", accent: "#ff5a1f", accent2: "#121212", light: "#ffffff", lightIntensity: 1 })),
  zone("lounge", null, "Lounge", "Sit, browse, regroup", 1, 1,
    P({ floor: "#cdb59a", floorLine: "#b89d80", floorKind: "planks", wall: "#e7e1d5", trim: "#6e8b74", accent: "#6e8b74", accent2: "#c98f5a", light: "#ffe0b0", lightIntensity: 0.9 })),
];

export const DEPARTMENT_ZONES = ZONES.filter((z) => z.department !== null);

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

/** Half of the world footprint, used to size the base slab and camera framing. */
export const WORLD_HALF = GRID_SPACING + ZONE_SIZE / 2 + 2;
