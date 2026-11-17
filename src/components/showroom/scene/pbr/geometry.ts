import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ItemKind } from "@/modules/showroom/types";

/**
 * Shared, cached geometry. Garments are tailored silhouettes (extruded with a bevelled edge and a
 * fabric bulge), not boxes. Every consumer uses `dispose={null}` and the cache is released in one call.
 */
const cache = new Map<string, THREE.BufferGeometry>();
export function cachedGeometry(key: string, make: () => THREE.BufferGeometry) {
  let g = cache.get(key);
  if (!g) { g = make(); cache.set(key, g); }
  return g;
}
export function disposeGeometry() { cache.forEach((g) => g.dispose()); cache.clear(); }

type P = readonly [number, number];
/** Smooth closed outline through points (metres; y is negative downwards). */
function smooth(pts: P[], samples = 6): THREE.Vector2[] {
  const v = pts.map(([x, y]) => new THREE.Vector2(x, y));
  const curve = new THREE.SplineCurve([...v, v[0]!]);
  return curve.getPoints(pts.length * samples);
}
/** Mirror a right-hand half outline (from top-centre down to bottom-centre) into a full symmetric outline. */
const mirror = (half: P[]): P[] => [...half.map(([x, y]) => [x, y] as P), ...half.slice().reverse().map(([x, y]) => [-x, y] as P)];

const HALF: Partial<Record<ItemKind, P[]>> = {
  tee: [[0.0, 0.015], [0.085, 0.0], [0.23, -0.03], [0.42, -0.2], [0.365, -0.275], [0.25, -0.215], [0.235, -0.45], [0.24, -0.68], [0, -0.69]],
  shirt: [[0.0, 0.02], [0.08, 0.0], [0.24, -0.03], [0.33, -0.07], [0.36, -0.6], [0.31, -0.62], [0.24, -0.25], [0.225, -0.5], [0.23, -0.83], [0, -0.85]],
  hoodie: [[0.0, 0.01], [0.1, 0.0], [0.27, -0.04], [0.38, -0.12], [0.43, -0.64], [0.36, -0.66], [0.28, -0.28], [0.28, -0.58], [0.285, -0.72], [0, -0.73]],
  jacket: [[0.0, 0.0], [0.1, -0.01], [0.27, -0.04], [0.37, -0.12], [0.4, -0.66], [0.33, -0.68], [0.28, -0.28], [0.275, -0.5], [0.285, -0.78], [0, -0.79]],
  coat: [[0.0, 0.0], [0.1, -0.01], [0.28, -0.04], [0.38, -0.13], [0.41, -0.8], [0.34, -0.82], [0.295, -0.3], [0.3, -0.7], [0.32, -1.12], [0, -1.13]],
  dress: [[0.0, 0.0], [0.07, -0.02], [0.18, -0.05], [0.165, -0.2], [0.14, -0.4], [0.2, -0.65], [0.32, -1.08], [0, -1.09]],
};
const TRUSERS: P[] = [[-0.19, 0], [0.19, 0], [0.205, -0.5], [0.22, -0.98], [0.045, -0.98], [0.008, -0.3], [-0.008, -0.3], [-0.045, -0.98], [-0.22, -0.98], [-0.205, -0.5]];

const DEPTH: Partial<Record<ItemKind, number>> = { tee: 0.06, shirt: 0.06, hoodie: 0.13, jacket: 0.11, coat: 0.13, dress: 0.09, trousers: 0.08, suit: 0.11 };

/** Garment origin = centre of the shoulder line; hangs down (-y); front faces +z. `bulge` = how much fabric puffs out at the centre. */
export function garmentGeometry(kind: ItemKind, bulge = 0.025): THREE.BufferGeometry {
  return cachedGeometry(`garment|${kind}|${bulge}`, () => {
    const outline = kind === "trousers" ? smooth(TRUSERS.slice(), 4) : smooth(mirror(HALF[kind === "suit" ? "jacket" : kind]!), 5);
    const shape = new THREE.Shape(outline);
    const d = DEPTH[kind] ?? 0.06;
    if (["tee", "shirt", "hoodie", "jacket", "coat"].includes(kind)) {
      const hole = new THREE.Path();
      hole.absellipse(0, -0.01, 0.075, 0.035, 0, Math.PI * 2, false);
      shape.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -d / 2);
    const pos = g.attributes.position!;
    const hw = kind === "trousers" ? 0.22 : kind === "dress" ? 0.3 : 0.4;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const k = 1 - Math.min(1, (x / hw) ** 2);
      pos.setZ(i, z + Math.sign(z) * bulge * k);
    }
    g.computeVertexNormals();
    return g;
  });
}

/** Wooden clothes hanger; origin at the hook top, arms at about -0.1. */
export function hangerGeometry(): THREE.BufferGeometry {
  return cachedGeometry("hanger", () => {
    const arms = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.2, -0.13, 0), new THREE.Vector3(-0.1, -0.095, 0), new THREE.Vector3(0, -0.08, 0), new THREE.Vector3(0.1, -0.095, 0), new THREE.Vector3(0.2, -0.13, 0)]), 12, 0.006, 6, false);
    const neck = new THREE.CylinderGeometry(0.006, 0.006, 0.06, 6); neck.translate(0, -0.05, 0);
    const hook = new THREE.TorusGeometry(0.022, 0.0035, 6, 14, Math.PI * 1.45); hook.rotateZ(Math.PI * 0.2); hook.translate(0.0, 0.0, 0);
    return mergeGeometries([arms, neck, hook])!;
  });
}

/** Side-profile sneaker, extruded across its width. Origin on the ground, toe towards +x. */
export function sneakerGeometry(): { upper: THREE.BufferGeometry; sole: THREE.BufferGeometry } {
  const upper = cachedGeometry("sneaker-upper", () => {
    const s = new THREE.Shape(smooth([[-0.15, 0.03], [-0.158, 0.09], [-0.135, 0.15], [-0.085, 0.165], [-0.04, 0.125], [0.02, 0.115], [0.085, 0.085], [0.14, 0.055], [0.162, 0.038]], 5));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.075, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.018, bevelSegments: 3, curveSegments: 10 });
    g.translate(0, 0.012, -0.0375); g.computeVertexNormals();
    return g;
  });
  const sole = cachedGeometry("sneaker-sole", () => {
    const w = 0.34, r = 0.03, s = new THREE.Shape();
    s.moveTo(-w / 2 + r, 0); s.lineTo(w / 2 - r, 0); s.quadraticCurveTo(w / 2 + 0.01, 0, w / 2 + 0.01, r); s.lineTo(w / 2 - 0.01, 0.04); s.lineTo(-w / 2 + 0.02, 0.04); s.quadraticCurveTo(-w / 2 - 0.008, 0.03, -w / 2, 0.012); s.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.095, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2, curveSegments: 8 });
    g.translate(0, 0, -0.0475); g.computeVertexNormals();
    return g;
  });
  return { upper, sole };
}

export function leafGeometry(): THREE.BufferGeometry {
  return cachedGeometry("leaf", () => {
    const g = new THREE.SphereGeometry(1, 10, 8); g.scale(0.075, 0.012, 0.19); g.translate(0, 0, 0.17);
    return g;
  });
}
