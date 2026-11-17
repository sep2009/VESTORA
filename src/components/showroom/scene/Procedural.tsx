"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { ItemKind } from "@/modules/showroom/types";
import { cachedGeometry, garmentGeometry, sneakerGeometry } from "./pbr/geometry";
import { blackSteel, brass, chrome, darkGlass, fabric, leather, mannequin as mannequinMat, paint, rubber, brushedMetal } from "./pbr/materials";
import { Part } from "./Part";

export const GARMENT_KINDS: readonly ItemKind[] = ["tee", "shirt", "hoodie", "jacket", "coat", "dress", "suit", "trousers"];
export const isGarment = (k: ItemKind) => GARMENT_KINDS.includes(k);

const shade = (c: string, f: number) => `#${new THREE.Color(c).multiplyScalar(f).getHexString()}`;
/** Fashion colours straight from the catalogue are often fully saturated; real dyed fabric is slightly muted. */
export const fabricColor = (c: string) => {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(c).getHSL(hsl);
  return `#${new THREE.Color().setHSL(hsl.h, hsl.s * 0.62, Math.min(0.62, hsl.l * 0.92)).getHexString()}`;
};

/**
 * Hanging garment. Origin = centre of the shoulder line, hangs down (-y), front faces +z.
 * Tailored silhouette with a fabric bulge, not a box. (Temporary: replace with scanned GLB garments, see docs/ASSETS.md.)
 */
export function Garment({ kind, color, bulge = 0.025 }: { kind: ItemKind; color: string; bulge?: number }) {
  const c = fabricColor(color);
  if (kind === "suit") {
    return (
      <group>
        <Part geo={garmentGeometry("suit", bulge)} mat={fabric(c)} />
        <Part geo={garmentGeometry("trousers", bulge)} mat={fabric(shade(c, 0.9))} position={[0, -0.5, 0]} />
      </group>
    );
  }
  const lapel = kind === "jacket" || kind === "coat";
  return (
    <group>
      <Part geo={garmentGeometry(kind, bulge)} mat={fabric(c)} />
      {kind === "hoodie" && <Part geo={cachedGeometry("hood", () => { const g = new THREE.SphereGeometry(0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62); g.scale(1, 0.75, 0.8); return g; })} mat={fabric(shade(c, 0.92))} position={[0, 0.02, -0.07]} rotation={[0.3, 0, 0]} />}
      {lapel && [-1, 1].map((s) => (
        <Part key={s} geo={cachedGeometry("lapel", () => { const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.1, -0.02), new THREE.Vector2(0.03, -0.3), new THREE.Vector2(0, -0.28)]); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false }); g.translate(0, 0, 0.045); return g; })} mat={fabric(shade(c, 0.82))} scale={[s, 1, 1]} position={[0, 0.0, bulge * 0.9]} />
      ))}
    </group>
  );
}

/** Folded garment stack for tables and shelves. */
export function FoldedStack({ color, count = 3 }: { color: string; count?: number }) {
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <RoundedBox key={i} args={[0.4, 0.05, 0.3]} radius={0.016} smoothness={3} position={[0, 0.027 + i * 0.052, 0]} rotation={[0, (i % 2 ? 1 : -1) * 0.04, 0]} castShadow receiveShadow material={fabric(i % 2 ? shade(fabricColor(color), 0.94) : fabricColor(color))} />
      ))}
    </group>
  );
}

const torsoGeo = () => cachedGeometry("mq-torso", () => {
  const pts = [[0.001, 0], [0.135, 0.0], [0.17, 0.07], [0.175, 0.16], [0.145, 0.3], [0.15, 0.4], [0.178, 0.5], [0.172, 0.58], [0.12, 0.65], [0.05, 0.7], [0.04, 0.75]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, 28); g.scale(1, 1, 0.62); return g;
});
const limb = (rt: number, rb: number, h: number) => cachedGeometry(`limb|${rt}|${rb}|${h}`, () => new THREE.CylinderGeometry(rt, rb, h, 14, 1));

/**
 * Mannequin: lathe torso, tapered limbs, egg head, satin finish, round steel base.
 * Standing on the floor (y = 0), about 1.85 m tall; `bust` = dress form on a pole for pedestals.
 */
export function Mannequin({ kind, color, bust = false, finish = "#d6d1c7" }: { kind: ItemKind; color: string; bust?: boolean; finish?: string }) {
  const m = mannequinMat(finish);
  const hipY = bust ? 0.34 : 0.88;
  const anchor = hipY + (kind === "trousers" ? 0.1 : 0.59);
  const fit = kind === "suit" ? 0.95 : 1;
  const s = bust ? 0.88 : 1;
  return (
    <group scale={s}>
      <Part geo={limb(0.3, 0.3, 0.02)} mat={brushedMetal("#9a9da1")} position={[0, 0.01, 0]} />
      {bust ? (
        <Part geo={limb(0.014, 0.014, hipY)} mat={chrome()} position={[0, hipY / 2, 0]} />
      ) : (
        <>
          {[-1, 1].map((x) => (
            <group key={x} position={[x * 0.085, 0, 0]}>
              <Part geo={limb(0.06, 0.044, 0.44)} mat={m} position={[0, 0.66, 0]} />
              <Part geo={limb(0.044, 0.03, 0.43)} mat={m} position={[0, 0.235, 0]} />
              <Part geo={limb(0.03, 0.03, 0.09)} mat={m} position={[0, 0.045, 0.02]} rotation={[0.9, 0, 0]} />
            </group>
          ))}
          {[-1, 1].map((x) => (
            <group key={`a${x}`} position={[x * 0.245, hipY + 0.45, 0]} rotation={[0, 0, x * 0.32]}>
              <Part geo={limb(0.034, 0.026, 0.56)} mat={m} position={[0, -0.26, 0]} />
            </group>
          ))}
        </>
      )}
      <Part geo={torsoGeo()} mat={m} position={[0, hipY, 0]} />
      <Part geo={limb(0.038, 0.045, 0.1)} mat={m} position={[0, hipY + 0.78, 0]} />
      {!bust && <Part geo={cachedGeometry("mq-head", () => { const g = new THREE.SphereGeometry(1, 20, 16); g.scale(0.082, 0.112, 0.098); return g; })} mat={m} position={[0, hipY + 0.9, 0.005]} />}
      <group position={[0, anchor, 0]} scale={fit}>
        {kind === "suit" || isGarment(kind) ? <Garment kind={kind} color={color} bulge={0.1} /> : null}
      </group>
    </group>
  );
}

/** Small accessories at true scale (origin = centre of the base on the ground). Temporary procedural stand-ins. */
export function AccessoryObject({ kind, color }: { kind: ItemKind; color: string }) {
  const sneaker = useMemo(() => (kind === "sneaker" ? sneakerGeometry() : null), [kind]);
  const c = fabricColor(color);
  switch (kind) {
    case "sneaker": return (
      <group position={[0, 0.0, 0]}>
        <Part geo={sneaker!.sole} mat={rubber("#ece9e2")} />
        <Part geo={sneaker!.upper} mat={leather(c)} position={[0, 0.0, 0]} />
        <Part geo={cachedGeometry("lace-strip", () => new THREE.BoxGeometry(0.1, 0.006, 0.03))} mat={paint("#f1efe9", 0.8)} position={[0.035, 0.145, 0]} rotation={[0, 0, -0.36]} />
        <Part geo={cachedGeometry("heel-tab", () => new THREE.BoxGeometry(0.018, 0.05, 0.06))} mat={leather(shade(c, 0.7))} position={[-0.152, 0.1, 0]} />
      </group>);
    case "bag": return (
      <group>
        <RoundedBox args={[0.32, 0.22, 0.12]} radius={0.03} smoothness={4} position={[0, 0.115, 0]} castShadow receiveShadow material={leather(c)} />
        <RoundedBox args={[0.322, 0.095, 0.126]} radius={0.025} smoothness={4} position={[0, 0.19, 0]} castShadow material={leather(shade(c, 0.88))} />
        <mesh position={[0, 0.17, 0.066]} castShadow material={brass()}><boxGeometry args={[0.03, 0.03, 0.008]} /></mesh>
        <mesh position={[0, 0.225, 0]} rotation={[0, 0, 0]} castShadow material={leather(shade(c, 0.8))}><torusGeometry args={[0.085, 0.009, 8, 24, Math.PI]} /></mesh>
      </group>);
    case "watch": return (
      <group>
        <Part geo={cachedGeometry("watch-pillow", () => new THREE.CylinderGeometry(0.04, 0.045, 0.07, 20))} mat={fabric("#2b2a28")} position={[0, 0.035, 0]} />
        <mesh position={[0, 0.045, 0]} castShadow material={leather("#2a1d14")} scale={[1, 1, 0.45]}><torusGeometry args={[0.043, 0.0095, 8, 28]} /></mesh>
        <group position={[0, 0.045, 0.048]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow material={brushedMetal(color)}><cylinderGeometry args={[0.027, 0.027, 0.012, 28]} /></mesh>
          <mesh position={[0, 0, 0.007]} material={darkGlass()}><circleGeometry args={[0.022, 28]} /></mesh>
          <mesh position={[0, 0.008, 0.0085]} material={brass()}><boxGeometry args={[0.002, 0.016, 0.001]} /></mesh>
          <mesh position={[0.005, 0, 0.0085]} rotation={[0, 0, -1.2]} material={brass()}><boxGeometry args={[0.002, 0.012, 0.001]} /></mesh>
        </group>
      </group>);
    case "glasses": return (
      <group position={[0, 0.032, 0]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.034, 0, 0]}>
            <mesh castShadow material={paint(c, 0.35)}><torusGeometry args={[0.022, 0.0032, 8, 24]} /></mesh>
            <mesh material={darkGlass()}><circleGeometry args={[0.0215, 24]} /></mesh>
            <mesh position={[s * 0.026, 0, -0.04]} castShadow material={paint(c, 0.35)}><boxGeometry args={[0.003, 0.004, 0.085]} /></mesh>
          </group>
        ))}
        <mesh position={[0, 0.006, 0]} material={paint(c, 0.35)}><boxGeometry args={[0.02, 0.004, 0.004]} /></mesh>
      </group>);
    default: return null;
  }
}

export { blackSteel };
