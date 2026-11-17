import { getZone } from "../layout";
import type { DisplayPlacement, DisplayType, ZoneId } from "../types";

/** Pure camera maths: no THREE, no React, no DOM. Poses are plain tuples so they can be tested in Node. */
export type V3 = readonly [number, number, number];
export type Pose = { pos: V3; target: V3 };
export type Stop = { id: string; label: string; pose: Pose };

export const FOV = 30;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const len = (v: V3) => Math.hypot(v[0], v[1], v[2]);
const norm = (v: V3): V3 => { const l = len(v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const along = (t: V3, d: V3, k: number, lift = 0): V3 => [t[0] + d[0] * k, t[1] + d[1] * k + lift, t[2] + d[2] * k];

/** Distance at which a box of the given half-size fits the viewport at this aspect ratio. */
export function fitDistance(aspect: number, halfW: number, halfH: number) {
  const t = Math.tan((FOV * Math.PI) / 360);
  return Math.max(halfH / t, halfW / (t * aspect));
}

const OVERVIEW_DIR = norm([0.62, 0.66, 0.78]);
const ZONE_DIR = norm([0.6, 0.5, 0.8]);

export function overviewPose(aspect: number): Pose {
  const target: V3 = [0, 0, 3];
  return { target, pos: along(target, OVERVIEW_DIR, clamp(fitDistance(aspect, 40, 31), 18, 240)) };
}

/** A room, seen from its open south-east side so the whole interior is visible. */
export function zonePose(id: ZoneId, aspect: number): Pose {
  const [cx, cz] = getZone(id).center;
  const target: V3 = [cx, 1.3, cz - 1];
  return { target, pos: along(target, ZONE_DIR, clamp(fitDistance(aspect, 10.5, 7.5), 15, 70)) };
}

const AIM_HEIGHT: Record<DisplayType, number> = { rack: 1, mannequin: 1.1, platform: 1.2, pedestal: 1.1, table: 0.8, shelf: 1.1, niche: 0 };

/** In front of a display, biased slightly towards the usual viewing side, looking at its middle. */
export function displayPose(p: DisplayPlacement, aspect: number): Pose {
  const ry = p.rotation[1];
  const front: V3 = [Math.sin(ry), 0, Math.cos(ry)];
  const dir = norm([front[0] * 0.75 + 0.62 * 0.25, 0, front[2] * 0.75 + 0.78 * 0.25]);
  const target: V3 = [p.position[0], p.position[1] + AIM_HEIGHT[p.type], p.position[2]];
  const dist = 6.2 * p.scale * clamp(0.9 / aspect, 1, 2.2);
  return { target, pos: along(target, dir, dist, 2.4) };
}

type StopSpec = { id: string; label: string; pose: (a: number) => Pose };
const STOPS: StopSpec[] = [
  { id: "overview", label: "The mall", pose: overviewPose },
  { id: "approach", label: "Arrival", pose: () => ({ pos: [-6, 5.5, 52], target: [0, 3.2, 30] }) },
  { id: "lobby", label: "Entrance hall", pose: () => ({ pos: [8, 8, 37], target: [0, 1.5, 21] }) },
  { id: "new-arrivals", label: "New Arrivals", pose: (a) => zonePose("new-arrivals", a) },
  { id: "streetwear", label: "Streetwear", pose: (a) => zonePose("streetwear", a) },
  { id: "casual", label: "Casual", pose: (a) => zonePose("casual", a) },
  { id: "formal", label: "Formal", pose: (a) => zonePose("formal", a) },
  { id: "minimal", label: "Minimal", pose: (a) => zonePose("minimal", a) },
  { id: "luxury", label: "Luxury", pose: (a) => zonePose("luxury", a) },
  { id: "accessories", label: "Accessories", pose: (a) => zonePose("accessories", a) },
  { id: "finale", label: "The mall", pose: overviewPose },
];
/** Portrait screens get a shorter tour: the approach and lobby shots add little on a narrow view. */
const PORTRAIT_SKIP = new Set(["approach", "lobby"]);

/**
 * The guided tour visits the rooms in the order they are physically connected
 * (hub → streetwear → casual → formal → minimal → luxury → accessories), so the camera never crosses the map.
 */
export function buildStops(aspect: number): Stop[] {
  return STOPS.filter((s) => aspect >= 0.8 || !PORTRAIT_SKIP.has(s.id)).map((s) => ({ id: s.id, label: s.label, pose: s.pose(aspect) }));
}

const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

/**
 * Camera pose for scroll progress 0..1. Each stop holds for a moment (dwell) and the moves between
 * stops follow a Catmull-Rom spline, so motion is continuous and fully reversible.
 * `discrete` snaps to the nearest stop (reduced motion).
 */
export function guidedPoseAt(stops: readonly Stop[], progress: number, discrete = false): { pose: Pose; index: number; label: string } {
  const n = stops.length;
  const s = clamp(progress, 0, 1) * (n - 1);
  const index = clamp(Math.round(s), 0, n - 1);
  const at = (i: number) => stops[clamp(i, 0, n - 1)]!.pose;
  if (discrete) return { pose: at(index), index, label: stops[index]!.label };
  const i = Math.min(Math.floor(s), n - 2);
  const t = smoother(clamp((s - i - 0.22) / 0.56, 0, 1));
  const mix = (key: "pos" | "target"): V3 => [0, 1, 2].map((a) =>
    catmull(at(i - 1)[key][a]!, at(i)[key][a]!, at(i + 1)[key][a]!, at(i + 2)[key][a]!, t)) as unknown as V3;
  const pos = mix("pos");
  // The spline can overshoot; never let the camera dip towards the ground between stops.
  return { pose: { pos: [pos[0], Math.max(pos[1], 2.2), pos[2]], target: mix("target") }, index, label: stops[index]!.label };
}

export const lerpPose = (a: Pose, b: Pose, k: number): Pose => ({
  pos: [0, 1, 2].map((i) => a.pos[i]! + (b.pos[i]! - a.pos[i]!) * k) as unknown as V3,
  target: [0, 1, 2].map((i) => a.target[i]! + (b.target[i]! - a.target[i]!) * k) as unknown as V3,
});
export const poseDistance = (a: Pose, b: Pose) => Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]);
