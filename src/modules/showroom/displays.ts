import { getZone } from "./layout";
import { getSample } from "./sample-products";
import type { DisplayPlacement, DisplayType, ZoneSlug } from "./types";

type Opts = { y?: number; scale?: number; spin?: boolean; glass?: boolean };
/** [sample number, display type, local x, local z, rotation in degrees about Y, options] */
type Row = readonly [number, DisplayType, number, number, number, Opts?];

/**
 * Placement data, in zone-local metres (zone centre = 0,0; back wall z = -8; west wall x = -8).
 * Rotation 0 faces south (+z, towards the camera); 90 faces east (+x, away from the west wall).
 * This file is pure data: no rendering, no THREE imports.
 */
const LAYOUT: Record<ZoneSlug, readonly Row[]> = {
  luxury: [
    [1, "mannequin", -4.5, -5.6, 0], [2, "mannequin", -3.2, -2.4, 0], [3, "mannequin", 4.5, -5.6, 0],
    [4, "rack", -6.2, -4.4, 90], [6, "rack", -6.2, 4.4, 90],
    [5, "pedestal", -1.8, 1.8, 0, { glass: true }], [7, "platform", 2.8, 1.6, 0],
    [8, "pedestal", 5.8, -4.4, 0, { glass: true }],
  ],
  streetwear: [
    [1, "rack", -4.5, -5.6, 0], [3, "rack", 4.5, -5.6, 0], [2, "rack", 6.2, 3.2, -90],
    [4, "shelf", -6.4, -4.6, 90], [7, "shelf", -6.4, 4.6, 90],
    [5, "mannequin", 2.2, -1.6, 0], [6, "mannequin", 5.2, -1, 0], [8, "table", 1.5, 3.2, 0],
  ],
  minimal: [
    [1, "rack", -4.5, -5.6, 0], [2, "rack", 0, -5.6, 0], [3, "rack", 4.5, -5.6, 0],
    [4, "mannequin", -3, 0.4, 0], [5, "mannequin", 0.6, 1.4, 0],
    [6, "table", 4.2, -3.2, 0], [7, "pedestal", -5.5, 4, 0], [8, "platform", 5.4, 4.6, 0],
  ],
  casual: [
    [1, "rack", -4.5, -5.6, 0], [2, "rack", 0, -5.6, 0], [3, "rack", 4.5, -5.6, 0],
    [4, "rack", -6.2, -3.6, 90], [5, "mannequin", -2, 1.6, 0],
    [6, "table", 3, 1.6, 0], [7, "shelf", -6.4, 4.2, 90], [8, "table", 5.4, -1.2, 0],
  ],
  formal: [
    [1, "mannequin", -4.5, -5.6, 0], [2, "mannequin", 0, -5.6, 0], [3, "mannequin", 4.5, -5.6, 0],
    [5, "mannequin", -3, 0, 0], [7, "mannequin", 3, 0.6, 0],
    [4, "rack", -6.2, -4.4, 90], [6, "rack", -6.2, 4.4, 90], [8, "table", 0.2, 4, 0],
  ],
  accessories: [
    [1, "shelf", -5, -6.5, 0], [2, "shelf", 5, -6.5, 0], [3, "niche", -7.55, 0, 90, { y: 1.7 }],
    [4, "pedestal", -3.5, 0, 0, { glass: true }], [5, "pedestal", 0, 0.8, 0, { glass: true }],
    [6, "pedestal", 3.5, 0, 0, { glass: true }], [7, "shelf", -6.4, 4.4, 90], [8, "pedestal", 5.6, 3.6, 0, { glass: true }],
  ],
  "new-arrivals": [
    [1, "platform", 0, -0.4, 0, { spin: true, scale: 1.25 }],
    [2, "platform", -4.4, 4.4, 0, { spin: true }], [3, "platform", 4.4, 4.4, 0, { spin: true }],
    [4, "platform", -4, -4.4, 0, { spin: true }], [5, "platform", 4, -4.4, 0, { spin: true }],
    [6, "table", -6.6, -4.6, 90], [7, "table", 6.6, -4.6, -90], [8, "shelf", -6.8, 5.6, 90],
  ],
};

const rad = (d: number) => (d * Math.PI) / 180;

export const DISPLAYS: readonly DisplayPlacement[] = (Object.keys(LAYOUT) as ZoneSlug[]).flatMap((slug) => {
  const [cx, cz] = getZone(slug).center;
  return LAYOUT[slug].map(([n, type, x, z, deg, o = {}]): DisplayPlacement => {
    const sampleId = `sample-${slug}-${n}`;
    const sample = getSample(sampleId);
    if (!sample) throw new Error(`Missing sample product ${sampleId}`);
    return {
      id: `${slug}-${type}-${n}`,
      departmentId: slug,
      position: [cx + x, o.y ?? 0, cz + z],
      rotation: [0, rad(deg), 0],
      scale: o.scale ?? 1,
      type,
      productRef: { kind: "sample", sampleId },
      itemKind: sample.kind,
      itemColor: sample.color,
      spin: o.spin,
      glass: o.glass,
    };
  });
});
