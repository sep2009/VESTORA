import * as THREE from "three";

/**
 * Parametric mannequin. The "rig" is a table of joints and body measurements in metres (standing, slight A-pose).
 * Garments are generated from the same measurements (see garments.ts), which is what keeps them fitted to the avatar.
 * This is a PREVIEW fit (shapes follow the body with ease). It is not skinned and not a cloth simulation.
 * To integrate a professional avatar/fitting service later, implement `AvatarAdapter` in ./adapter.ts and keep the studio unchanged.
 */
export type Ring = { rx: number; rz: number };
export type BodySpec = {
  id: string; label: string; presentation: "masculine" | "feminine"; height: number;
  shoulder: number; chest: Ring; waist: Ring; hip: Ring; hipX: number; thigh: number; knee: number; calf: number; ankle: number; arm: number; forearm: number; wrist: number; neck: number; chestForward?: number;
};
export const BODIES: Record<string, BodySpec> = {
  m1: { id: "m1", label: "Alex", presentation: "masculine", height: 1.78, shoulder: 0.2, chest: { rx: 0.165, rz: 0.108 }, waist: { rx: 0.14, rz: 0.095 }, hip: { rx: 0.165, rz: 0.105 }, hipX: 0.095, thigh: 0.088, knee: 0.058, calf: 0.062, ankle: 0.042, arm: 0.05, forearm: 0.042, wrist: 0.03, neck: 0.056 },
  m2: { id: "m2", label: "Jordan", presentation: "masculine", height: 1.84, shoulder: 0.225, chest: { rx: 0.185, rz: 0.12 }, waist: { rx: 0.17, rz: 0.115 }, hip: { rx: 0.18, rz: 0.12 }, hipX: 0.1, thigh: 0.098, knee: 0.064, calf: 0.068, ankle: 0.045, arm: 0.058, forearm: 0.047, wrist: 0.032, neck: 0.062 },
  f1: { id: "f1", label: "Maya", presentation: "feminine", height: 1.68, shoulder: 0.172, chest: { rx: 0.14, rz: 0.1 }, waist: { rx: 0.108, rz: 0.08 }, hip: { rx: 0.172, rz: 0.108 }, hipX: 0.092, thigh: 0.088, knee: 0.054, calf: 0.056, ankle: 0.037, arm: 0.04, forearm: 0.035, wrist: 0.026, neck: 0.046, chestForward: 0.012 },
  f2: { id: "f2", label: "Sasha", presentation: "feminine", height: 1.74, shoulder: 0.185, chest: { rx: 0.15, rz: 0.108 }, waist: { rx: 0.125, rz: 0.092 }, hip: { rx: 0.19, rz: 0.118 }, hipX: 0.1, thigh: 0.098, knee: 0.06, calf: 0.06, ankle: 0.04, arm: 0.044, forearm: 0.038, wrist: 0.028, neck: 0.049, chestForward: 0.014 },
};
export const BASE_H = 1.75;
export const ARM_ANGLE = 0.15;
export const ARM_LEN = 0.55; // shoulder joint to wrist
export const SHOULDER_Y = 1.415;
export const HEAD = { y: 1.645, rx: 0.084, ry: 0.108, rz: 0.097 };

/** Joints, for attaching garments, bags and accessories. */
export function joints(s: BodySpec) {
  return { shoulderL: [-(s.shoulder - 0.014), SHOULDER_Y, 0], shoulderR: [s.shoulder - 0.014, SHOULDER_Y, 0], hipL: [-s.hipX, 0.88, 0], hipR: [s.hipX, 0.88, 0], head: [0, HEAD.y, 0] } as const;
}

// ----- smooth profiles -----
type Sec = { y: number; rx: number; rz: number; cx?: number; cz?: number };
const cr = (p0: number, p1: number, p2: number, p3: number, t: number) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
/** Catmull-Rom through key sections (sorted by ascending y) evaluated at y. */
export function sample(keys: readonly Sec[], y: number): Sec {
  const n = keys.length;
  if (y <= keys[0]!.y) return { ...keys[0]!, y };
  if (y >= keys[n - 1]!.y) return { ...keys[n - 1]!, y };
  let i = 0; while (i < n - 2 && y > keys[i + 1]!.y) i++;
  const k = (j: number) => keys[Math.max(0, Math.min(n - 1, j))]!;
  const t = (y - k(i).y) / (k(i + 1).y - k(i).y);
  const f = (key: "rx" | "rz" | "cx" | "cz") => cr(k(i - 1)[key] ?? 0, k(i)[key] ?? 0, k(i + 1)[key] ?? 0, k(i + 2)[key] ?? 0, t);
  return { y, rx: Math.max(0.005, f("rx")), rz: Math.max(0.005, f("rz")), cx: f("cx"), cz: f("cz") };
}
export function torsoKeys(s: BodySpec): Sec[] {
  return [
    { y: 0.7, rx: s.hip.rx * 0.62, rz: s.hip.rz * 0.6 },
    { y: 0.78, rx: s.hip.rx * 1.0, rz: s.hip.rz * 0.92 },
    { y: 0.84, rx: s.hip.rx * 1.04, rz: s.hip.rz * 0.97 },
    { y: 0.92, rx: s.hip.rx * 1.03, rz: s.hip.rz },
    { y: 1.06, rx: s.waist.rx, rz: s.waist.rz },
    { y: 1.2, rx: s.waist.rx * 0.5 + s.chest.rx * 0.5, rz: s.waist.rz * 0.4 + s.chest.rz * 0.6 },
    { y: 1.3, rx: s.chest.rx, rz: s.chest.rz, cz: s.chestForward },
    { y: 1.4, rx: s.shoulder * 0.93, rz: s.chest.rz * 0.8 },
    { y: 1.46, rx: s.shoulder * 0.8, rz: 0.075 },
    { y: 1.5, rx: s.neck * 1.5, rz: s.neck * 1.35 },
    { y: 1.535, rx: s.neck, rz: s.neck },
    { y: 1.58, rx: s.neck, rz: s.neck },
  ];
}

export const torsoAt = (s: BodySpec, y: number) => sample(torsoKeys(s), y);
/** Arm radius at distance d below the shoulder joint, measured along the arm. */
export function armR(s: BodySpec, d: number): number {
  const keys = [{ y: 0, rx: s.arm * 1.15, rz: 0 }, { y: 0.1, rx: s.arm, rz: 0 }, { y: 0.28, rx: s.forearm * 1.15, rz: 0 }, { y: 0.4, rx: s.forearm, rz: 0 }, { y: ARM_LEN, rx: s.wrist, rz: 0 }];
  return sample(keys, d).rx;
}
/** Leg radius at height y (0 = ground). */
export function legR(s: BodySpec, y: number): number {
  const keys = [{ y: 0.06, rx: s.ankle, rz: 0 }, { y: 0.12, rx: s.ankle * 1.02, rz: 0 }, { y: 0.3, rx: s.calf, rz: 0 }, { y: 0.5, rx: s.knee, rz: 0 }, { y: 0.7, rx: s.thigh * 0.95, rz: 0 }, { y: 0.88, rx: s.thigh * 1.05, rz: 0 }];
  return sample(keys, y).rx;
}

/** Surface of revolution through elliptical sections (bottom to top by y). Optionally closed at either end. */
export function loft(secs: readonly Sec[], opt: { radial?: number; capTop?: boolean; capBottom?: boolean } = {}): THREE.BufferGeometry {
  const R = opt.radial ?? 28, n = secs.length;
  const pos: number[] = [], idx: number[] = [];
  secs.forEach((s) => { for (let j = 0; j < R; j++) { const a = (j / R) * Math.PI * 2; pos.push((s.cx ?? 0) + s.rx * Math.sin(a), s.y, (s.cz ?? 0) + s.rz * Math.cos(a)); } });
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < R; j++) {
    const a = i * R + j, b = i * R + ((j + 1) % R), c = (i + 1) * R + j, d = (i + 1) * R + ((j + 1) % R);
    idx.push(a, b, c, b, d, c);
  }
  const cap = (i: number, up: boolean) => {
    const s = secs[i]!; const ci = pos.length / 3; pos.push(s.cx ?? 0, s.y, s.cz ?? 0);
    for (let j = 0; j < R; j++) { const a = i * R + j, b = i * R + ((j + 1) % R); up ? idx.push(ci, a, b) : idx.push(ci, b, a); }
  };
  if (opt.capBottom) cap(0, false);
  if (opt.capTop) cap(n - 1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** Evenly spaced sections between y0 and y1 (inclusive) from a function. */
export function ring(y0: number, y1: number, steps: number, f: (y: number) => Omit<Sec, "y">): Sec[] {
  return Array.from({ length: steps + 1 }, (_, i) => { const y = y0 + ((y1 - y0) * i) / steps; return { y, ...f(y) }; });
}
