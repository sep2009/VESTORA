import { getZone } from "./layout";
import type { DisplaySlot, DisplayType, SlotAccepts, ZoneSlug } from "./types";

type Opts = { y?: number; scale?: number; spin?: boolean; glass?: boolean };
/** [fixture type, accepts, capacity, local x, local z, rotation in degrees about Y, options] */
type Row = readonly [DisplayType, SlotAccepts, number, number, number, number, Opts?];

/**
 * Fixture layout per department, in zone-local metres (zone centre = 0,0; back wall z = -8; west wall x = -8).
 * Rotation 0 faces south (+z, towards the camera); 90 faces east (+x). Pure layout data: no products, no rendering.
 * Positions keep doorways clear (checked by the layout test).
 */
const G: SlotAccepts = "garment", F: SlotAccepts = "footwear", A: SlotAccepts = "accessory", ANY: SlotAccepts = "any";

/** Back wall closed (top row of rooms): three mannequins along the back wall. */
const NORTH_CLOSED: Row[] = [
  ["mannequin", G, 1, -4.5, -5.6, 0], ["mannequin", G, 1, 0, -5.6, 0], ["mannequin", G, 1, 4.5, -5.6, 0],
  ["rack", G, 6, -6.2, -4.4, 90], ["rack", G, 6, -6.2, 4.4, 90],
  ["table", ANY, 3, -1.8, 1.8, 0], ["platform", G, 1, 2.8, 1.6, 0], ["pedestal", A, 1, 5.8, -4.4, 0, { glass: true }],
];
/** A doorway in the back wall: keep the centre clear. */
const NORTH_OPEN: Row[] = [
  ["rack", G, 6, -4.5, -5.6, 0], ["rack", G, 6, 4.5, -5.6, 0], ["rack", G, 5, 6.2, 3.2, -90],
  ["shelf", ANY, 6, -6.4, -4.6, 90], ["shelf", ANY, 6, -6.4, 4.6, 90],
  ["mannequin", G, 1, 2.2, -1.6, 0], ["mannequin", G, 1, 5.2, -3.3, 0], ["table", ANY, 3, 1.5, 3.2, 0],
];

const LAYOUT: Record<ZoneSlug, readonly Row[]> = {
  formal: NORTH_CLOSED,
  luxury: NORTH_CLOSED,
  denim: NORTH_CLOSED,
  sportswear: NORTH_OPEN,
  casual: NORTH_OPEN,
  streetwear: NORTH_OPEN,
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

const rad = (d: number) => (d * Math.PI) / 180;

export const SLOTS: readonly DisplaySlot[] = (Object.keys(LAYOUT) as ZoneSlug[]).flatMap((slug) => {
  const [cx, cz] = getZone(slug).center;
  return LAYOUT[slug].map(([type, accepts, capacity, x, z, deg, o = {}], i): DisplaySlot => ({
    id: `${slug}-${i + 1}-${type}`,
    departmentId: slug,
    position: [cx + x, o.y ?? 0, cz + z],
    rotation: [0, rad(deg), 0],
    scale: o.scale ?? 1,
    type, accepts, capacity,
    spin: o.spin, glass: o.glass,
  }));
});
