import { z } from "zod";
import { DOOR_WIDTH, ZONE_SIZE, getZone, openingsFor } from "./layout";
import type { DisplaySlot, DisplayType, SlotAccepts, ZoneSlug } from "./types";

/** Fixture records: pure data, edited in the admin showroom editor, never in 3D component code. Local metres relative to the room centre. */
export const ZONE_SLUGS = ["sportswear", "sneakers", "streetwear", "luxury", "casual", "formal", "denim", "accessories", "new-arrivals"] as const;
export const DISPLAY_TYPES = ["rack", "mannequin", "platform", "shelf", "pedestal", "table", "niche"] as const;
export const ACCEPTS = ["garment", "footwear", "accessory", "any"] as const;
const SINGLE: readonly string[] = ["mannequin", "platform", "pedestal", "niche"];

export const slotRecord = z.object({
  id: z.string().min(1).max(60).regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, numbers and dashes"),
  department: z.enum(ZONE_SLUGS),
  type: z.enum(DISPLAY_TYPES),
  accepts: z.enum(ACCEPTS),
  capacity: z.number().int().min(1).max(8),
  x: z.number().min(-7.6).max(7.6),
  z: z.number().min(-7.6).max(7.6),
  y: z.number().min(0).max(3).default(0),
  rotationDeg: z.number().min(-180).max(180),
  scale: z.number().min(0.5).max(2),
  visible: z.boolean().default(true),
  glass: z.boolean().default(false),
  spin: z.boolean().default(false),
});
export type SlotRecord = z.infer<typeof slotRecord>;

type Opts = { y?: number; scale?: number; spin?: boolean; glass?: boolean };
type Row = readonly [DisplayType, SlotAccepts, number, number, number, number, Opts?];
const G: SlotAccepts = "garment", F: SlotAccepts = "footwear", A: SlotAccepts = "accessory", ANY: SlotAccepts = "any";

const NORTH_CLOSED: Row[] = [
  ["mannequin", G, 1, -4.5, -5.6, 0], ["mannequin", G, 1, 0, -5.6, 0], ["mannequin", G, 1, 4.5, -5.6, 0],
  ["rack", G, 6, -6.2, -4.4, 90], ["rack", G, 6, -6.2, 4.4, 90],
  ["table", ANY, 3, -1.8, 1.8, 0], ["platform", G, 1, 2.8, 1.6, 0], ["pedestal", A, 1, 5.8, -4.4, 0, { glass: true }],
];
const NORTH_OPEN: Row[] = [
  ["rack", G, 6, -4.5, -5.6, 0], ["rack", G, 6, 4.5, -5.6, 0], ["rack", G, 5, 6.2, 3.2, -90],
  ["shelf", ANY, 6, -6.4, -4.6, 90], ["shelf", ANY, 6, -6.4, 4.6, 90],
  ["mannequin", G, 1, 2.2, -1.6, 0], ["mannequin", G, 1, 5.2, -3.3, 0], ["table", ANY, 3, 1.5, 3.2, 0],
];
const LAYOUT: Record<ZoneSlug, readonly Row[]> = {
  formal: NORTH_CLOSED, luxury: NORTH_CLOSED, denim: NORTH_CLOSED,
  sportswear: NORTH_OPEN, casual: NORTH_OPEN, streetwear: NORTH_OPEN,
  sneakers: [
    ["shelf", F, 6, -5, -6.5, 0], ["shelf", F, 6, 5, -6.5, 0], ["shelf", F, 6, -6.4, 4.4, 90], ["shelf", F, 6, 6.4, 4.4, -90],
    ["pedestal", F, 1, -3.5, 0, 0, { glass: true }], ["pedestal", F, 1, 3.5, 0, 0, { glass: true }],
    ["platform", F, 1, 0, 1.2, 0], ["table", F, 3, 0, 4.2, 0],
  ],
  accessories: [
    ["shelf", A, 6, -5, -6.5, 0], ["shelf", A, 6, 5, -6.5, 0], ["niche", A, 1, -7.55, 0, 90, { y: 1.7 }],
    ["pedestal", A, 1, -3.5, 0, 0, { glass: true }], ["pedestal", A, 1, 0, 0.8, 0, { glass: true }],
    ["pedestal", A, 1, 3.5, 0, 0, { glass: true }], ["shelf", A, 6, -6.4, 4.4, 90], ["pedestal", A, 1, 5.6, 3.6, 0, { glass: true }],
  ],
  "new-arrivals": [
    ["platform", ANY, 1, 0, -0.4, 0, { spin: true, scale: 1.25 }],
    ["platform", ANY, 1, -4.4, 4.4, 0, { spin: true }], ["platform", ANY, 1, 4.4, 4.4, 0, { spin: true }],
    ["platform", ANY, 1, -4, -4.4, 0, { spin: true }], ["platform", ANY, 1, 4, -4.4, 0, { spin: true }],
    ["table", ANY, 3, -6.6, -4.6, 90], ["table", ANY, 3, 6.6, -4.6, -90], ["shelf", ANY, 6, -6.8, 5.6, 90],
  ],
};

/** The shipped layout, used to seed the database. */
export function defaultSlotRecords(): SlotRecord[] {
  return ZONE_SLUGS.flatMap((dept) => LAYOUT[dept].map(([type, accepts, capacity, x, z, deg, o = {}], i): SlotRecord => ({
    id: `${dept}-${i + 1}-${type}`, department: dept, type, accepts, capacity, x, z, y: o.y ?? 0, rotationDeg: deg,
    scale: o.scale ?? 1, visible: true, glass: !!o.glass, spin: !!o.spin,
  })));
}

const rad = (d: number) => (d * Math.PI) / 180;
export function recordToSlot(r: SlotRecord): DisplaySlot {
  const [cx, cz] = getZone(r.department).center;
  return { id: r.id, departmentId: r.department, position: [cx + r.x, r.y, cz + r.z], rotation: [0, rad(r.rotationDeg), 0], scale: r.scale, type: r.type, accepts: r.accepts, capacity: r.capacity, spin: r.spin, glass: r.glass };
}
/** Hidden fixtures are not drawn and receive no products. */
export const recordsToSlots = (records: readonly SlotRecord[]) => records.filter((r) => r.visible).map(recordToSlot);

/**
 * Safety checks for a set of fixtures in ONE department: inside the room, doorways clear,
 * no overlapping fixtures, single-product fixtures hold one product, unique ids.
 */
export function validateSlots(records: readonly SlotRecord[], allIds: ReadonlySet<string> = new Set()): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const r of records) {
    const where = `"${r.id}"`;
    if (seen.has(r.id) || allIds.has(r.id)) errors.push(`${where}: duplicate fixture id`);
    seen.add(r.id);
    const zone = getZone(r.department), o = openingsFor(zone), half = ZONE_SIZE / 2;
    if (Math.abs(r.x) > half - 0.3 && r.type !== "niche") errors.push(`${where}: outside the room`);
    if (Math.abs(r.z) > half - 0.3 && r.type !== "niche") errors.push(`${where}: outside the room`);
    const clear = DOOR_WIDTH / 2 + 0.6;
    if (r.type !== "niche") {
      if (o.n && r.z < -3.5 && Math.abs(r.x) < clear) errors.push(`${where}: blocks the north doorway`);
      if (o.s && r.z > 3.5 && Math.abs(r.x) < clear) errors.push(`${where}: blocks the south doorway`);
      if (o.w && r.x < -3.5 && Math.abs(r.z) < clear) errors.push(`${where}: blocks the west doorway`);
      if (o.e && r.x > 3.5 && Math.abs(r.z) < clear) errors.push(`${where}: blocks the east doorway`);
    }
    if (SINGLE.includes(r.type) && r.capacity !== 1) errors.push(`${where}: a ${r.type} holds exactly one product`);
    if (r.type === "niche" && r.y < 1) errors.push(`${where}: a wall niche must be mounted at least 1 m up`);
  }
  const solid = records.filter((r) => r.type !== "niche");
  for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
    const a = solid[i]!, b = solid[j]!;
    if (Math.hypot(a.x - b.x, a.z - b.z) < 1.4) errors.push(`"${a.id}" and "${b.id}" overlap (closer than 1.4 m)`);
  }
  return errors;
}
