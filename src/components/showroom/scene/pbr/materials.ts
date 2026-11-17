import * as THREE from "three";
import { disposeTextures, pbr, type TexKind } from "./textures";

/**
 * Physically based materials, cached by recipe. Roughness lives in the maps (material.roughness = 1),
 * so surfaces are not uniformly glossy: polished stone is smooth, plaster and concrete are matte,
 * wood is satin, fabric is rough with a soft sheen.
 */
const cache = new Map<string, THREE.Material>();
function keep<T extends THREE.Material>(key: string, make: () => T): T {
  let m = cache.get(key) as T | undefined;
  if (!m) { m = make(); cache.set(key, m); }
  return m;
}

/** World size (m) one texture tile covers, so patterns keep real-world scale. */
const TILE: Record<TexKind, number> = {
  marble: 3.6, travertine: 2.4, limestone: 3.2, concrete: 4, terrazzo: 3, oak: 1.8, walnut: 1.8, parquet: 2.4,
  plaster: 3, fabric: 0.4, leather: 0.5, brushed: 1, wool: 1, slat: 0.6,
};

export function surface(kind: TexKind, color: string, w = 1, h = 1, o: { physical?: boolean; clearcoat?: number; env?: number; tile?: number } = {}) {
  const tile = o.tile ?? TILE[kind];
  const rep: [number, number] = [Math.max(0.01, w / tile), Math.max(0.01, h / tile)];
  return keep(`s|${kind}|${color}|${rep}|${o.clearcoat ?? 0}`, () => {
    const t = pbr(kind, color, rep);
    const common = {
      map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1,
      color: t.map ? "#ffffff" : color, envMapIntensity: o.env ?? 0.8, normalScale: new THREE.Vector2(1, 1),
    };
    return o.physical || o.clearcoat
      ? new THREE.MeshPhysicalMaterial({ ...common, clearcoat: o.clearcoat ?? 0, clearcoatRoughness: 0.12 })
      : new THREE.MeshStandardMaterial(common);
  });
}

export type FloorKind = "marble" | "limestone" | "travertine" | "concrete" | "terrazzo" | "oak" | "parquet" | "plaster";
export const floor = (kind: FloorKind, color: string, w: number, d: number) =>
  surface(kind, color, w, d, { clearcoat: kind === "marble" ? 0.5 : kind === "terrazzo" ? 0.25 : 0, env: kind === "marble" ? 1.1 : 0.7 });

/** Matte painted/plastered wall. */
export const wall = (color: string, w = 4, h = 4) => surface("plaster", color, w, h, { env: 0.5 });
export const wood = (kind: "oak" | "walnut" | "slat", color: string, w = 1, h = 1) => surface(kind, color, w, h, { env: 0.7 });

export const fabric = (color: string) => keep(`fabric|${color}`, () => {
  const t = pbr("fabric", "#ffffff", [1.2, 1.2]);
  return new THREE.MeshPhysicalMaterial({ color, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, sheen: 0.7, sheenRoughness: 0.85, sheenColor: new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.35), side: THREE.DoubleSide, envMapIntensity: 0.5 });
});
export const leather = (color: string) => keep(`leather|${color}`, () => {
  const t = pbr("leather", "#ffffff", [3, 3]);
  return new THREE.MeshPhysicalMaterial({ color, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, clearcoat: 0.25, clearcoatRoughness: 0.45, envMapIntensity: 0.8 });
});
export const wool = (color: string, w: number, h: number) => keep(`wool|${color}|${w}x${h}`, () => {
  const t = pbr("wool", "#ffffff", [w / 1, h / 1]);
  return new THREE.MeshStandardMaterial({ color, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, envMapIntensity: 0.3 });
});
export const brushedMetal = (color = "#c3c5c8") => keep(`brushed|${color}`, () => {
  const t = pbr("brushed", "#ffffff", [1.5, 1.5]);
  return new THREE.MeshStandardMaterial({ color, metalness: 1, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, envMapIntensity: 1.3 });
});
export const brass = () => keep("brass", () => new THREE.MeshStandardMaterial({ color: "#b8935a", metalness: 1, roughness: 0.32, envMapIntensity: 1.3 }));
export const blackSteel = () => keep("blacksteel", () => new THREE.MeshStandardMaterial({ color: "#1c1c1e", metalness: 0.85, roughness: 0.45, envMapIntensity: 1 }));
export const chrome = () => keep("chrome", () => new THREE.MeshStandardMaterial({ color: "#d4d6d9", metalness: 1, roughness: 0.18, envMapIntensity: 1.4 }));
export const rubber = (color = "#efede8") => keep(`rubber|${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.7, envMapIntensity: 0.5 }));
/** Plain painted or powder-coated surface with a faint sheen. */
export const paint = (color: string, rough = 0.62) => keep(`paint|${color}|${rough}`, () => new THREE.MeshStandardMaterial({ color, roughness: rough, envMapIntensity: 0.7 }));
export const glass = () => keep("glass", () => new THREE.MeshPhysicalMaterial({ color: "#e4efee", transparent: true, opacity: 0.16, roughness: 0.03, metalness: 0, ior: 1.5, envMapIntensity: 1.8, depthWrite: false, side: THREE.DoubleSide }));
export const darkGlass = () => keep("darkglass", () => new THREE.MeshPhysicalMaterial({ color: "#0d1214", roughness: 0.05, metalness: 0, transmission: 0, envMapIntensity: 1.6, clearcoat: 1 }));
/** Mannequin finish: matte satin. */
export const mannequin = (color: string) => keep(`mq|${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.5, envMapIntensity: 0.7 }));
/** Light fixture surface. Emissive is kept modest so it reads as a lit diffuser, not a glowing neon tube. */
export const lightStrip = (color = "#ffe9c9", intensity = 1.1) => keep(`light|${color}|${intensity}`, () => new THREE.MeshStandardMaterial({ color: "#f5f1ea", emissive: color, emissiveIntensity: intensity, roughness: 0.6 }));

export function disposeMaterials() {
  cache.forEach((m) => m.dispose());
  cache.clear();
  disposeTextures();
}
