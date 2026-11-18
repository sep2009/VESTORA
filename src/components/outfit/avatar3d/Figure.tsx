"use client";
import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { HAIR_COLORS, SKIN_TONES } from "@/modules/outfit/core";
import type { AvatarProps, WornItem } from "./adapter";
import { ARM_ANGLE, ARM_LEN, BASE_H, BODIES, HEAD, SHOULDER_Y, armR, legR, loft, ring, torsoAt, type BodySpec } from "./body";

/** Disposes geometries when they are replaced or the figure unmounts. */
function useGeos<T extends THREE.BufferGeometry[]>(make: () => T, deps: unknown[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const g = useMemo(make, deps);
  useEffect(() => () => g.forEach((x) => x.dispose()), [g]);
  return g;
}
const shade = (hex: string, dl: number) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, dl); return `#${c.getHexString()}`; };
function Fabric({ color, layer = 1, rough = 0.88 }: { color: string; layer?: number; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={0} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-layer} polygonOffsetUnits={-layer} />;
}
const Mesh = ({ g, children, ...p }: { g: THREE.BufferGeometry; children: ReactNode; position?: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number] }) => <mesh geometry={g} castShadow {...p}>{children}</mesh>;

// ---------- body ----------
const armSections = (s: BodySpec, ease: number, _from: number, to: number, steps = 10) => {
  const r0 = armR(s, 0) + ease;
  const body = ring(-to, 0, steps, (y) => { const r = armR(s, -y) + ease; return { rx: r, rz: r * 0.95 }; });
  // rounded shoulder dome so the arm tops are not flat discs
  return [...body, { y: 0.02, rx: r0 * 0.93, rz: r0 * 0.88 }, { y: 0.04, rx: r0 * 0.7, rz: r0 * 0.66 }, { y: 0.055, rx: r0 * 0.3, rz: r0 * 0.28 }];
};
const legSections = (s: BodySpec, side: number, ease: number, from: number, to: number, steps = 14) => ring(to, from, steps, (y) => { const r = legR(s, y) + ease; return { rx: r, rz: r * 0.95, cx: side * s.hipX }; });
const torsoSections = (s: BodySpec, ease: number, y0: number, y1: number, steps = 18) => ring(y0, y1, steps, (y) => { const t = torsoAt(s, y); return { rx: t.rx + ease, rz: t.rz + ease, cz: t.cz }; });

function Arm({ s, side, children }: { s: BodySpec; side: 1 | -1; children?: ReactNode }) {
  return <group position={[side * (s.shoulder - 0.014), SHOULDER_Y, 0]} rotation={[0, 0, side * ARM_ANGLE]}>{children}</group>;
}

function Body({ s, skin }: { s: BodySpec; skin: string }) {
  const [torso, arm, leg, foot, hand, sphere] = useGeos(() => [
    loft(torsoSections(s, 0, 0.7, 1.58, 30), { capBottom: true, capTop: true }),
    loft(armSections(s, 0, -0.03, ARM_LEN, 10), { capTop: true, capBottom: true, radial: 18 }),
    loft(legSections(s, 0, 0, 0.88, 0.06, 16), { capBottom: true, capTop: true, radial: 20 }),
    new THREE.SphereGeometry(1, 18, 12), new THREE.SphereGeometry(1, 14, 10), new THREE.SphereGeometry(1, 24, 18),
  ], [s]);
  const m = <meshStandardMaterial color={skin} roughness={0.62} metalness={0} />;
  return (
    <group>
      <Mesh g={torso}>{m}</Mesh>
      {([1, -1] as const).map((side) => (
        <group key={side}>
          <Arm s={s} side={side}>
            <Mesh g={arm}>{m}</Mesh>
            <Mesh g={hand} position={[0, -(ARM_LEN + 0.06), 0]} scale={[0.03, 0.068, 0.02]}>{m}</Mesh>
          </Arm>
          <group position={[side * s.hipX, 0, 0]}>
            <Mesh g={leg}>{m}</Mesh>
            <Mesh g={foot} position={[0, 0.038, 0.045]} scale={[0.04, 0.034, 0.11]}>{m}</Mesh>
          </group>
        </group>
      ))}
      {/* head, nose and ears give the figure a clear front and back */}
      <Mesh g={sphere} position={[0, HEAD.y, 0]} scale={[HEAD.rx, HEAD.ry, HEAD.rz]}>{m}</Mesh>
      <Mesh g={sphere} position={[0, HEAD.y - 0.012, HEAD.rz - 0.004]} scale={[0.014, 0.02, 0.022]}>{m}</Mesh>
      {([1, -1] as const).map((side) => <Mesh key={side} g={sphere} position={[side * (HEAD.rx - 0.002), HEAD.y, -0.005]} scale={[0.01, 0.026, 0.018]}>{m}</Mesh>)}
    </group>
  );
}

// ---------- hair ----------
function Hair({ style, color }: { style: string; color: string }) {
  const [cap, ball, tail, curtain] = useGeos(() => [
    new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, 1.95), new THREE.SphereGeometry(1, 16, 12),
    loft([{ y: 1.7, rx: 0.025, rz: 0.025, cz: -0.1 }, { y: 1.58, rx: 0.03, rz: 0.03, cz: -0.125 }, { y: 1.42, rx: 0.026, rz: 0.026, cz: -0.12 }, { y: 1.34, rx: 0.012, rz: 0.012, cz: -0.115 }], { radial: 10, capTop: true, capBottom: true }),
    loft([{ y: 1.3, rx: 0.1, rz: 0.03, cz: -0.075 }, { y: 1.42, rx: 0.108, rz: 0.04, cz: -0.07 }, { y: 1.56, rx: 0.1, rz: 0.06, cz: -0.055 }, { y: 1.66, rx: 0.092, rz: 0.075, cz: -0.03 }], { radial: 24 }),
  ], []);
  if (style === "none") return null;
  const k = style === "buzz" ? 1.012 : 1.05;
  const mat = <meshStandardMaterial color={color} roughness={0.85} side={THREE.DoubleSide} />;
  return (
    <group>
      <mesh geometry={cap} position={[0, HEAD.y + 0.002, -0.004]} rotation={[-0.22, 0, 0]} scale={[HEAD.rx * k, HEAD.ry * k, HEAD.rz * k]}>{mat}</mesh>
      {style === "short" && <mesh geometry={ball} position={[0, HEAD.y + 0.075, 0.015]} scale={[0.07, 0.04, 0.085]}>{mat}</mesh>}
      {style === "long" && <mesh geometry={curtain}>{mat}</mesh>}
      {style === "bun" && <mesh geometry={ball} position={[0, HEAD.y + 0.125, -0.055]} scale={0.048}>{mat}</mesh>}
      {style === "ponytail" && <mesh geometry={tail}>{mat}</mesh>}
    </group>
  );
}

// ---------- garments (preview fit: body-shaped with ease, not cloth simulation) ----------
type G = { s: BodySpec; c: string };
function Sleeves({ s, c, ease, len, layer, cuff }: G & { ease: number; len: number; layer: number; cuff?: string }) {
  const [sl, band] = useGeos(() => [loft(armSections(s, ease, -0.045, len, 10), { radial: 20, capTop: true }), loft(armSections(s, ease + 0.004, len - 0.035, len, 2), { radial: 20 })], [s, ease, len]);
  return <>{([1, -1] as const).map((side) => <Arm key={side} s={s} side={side}><Mesh g={sl}><Fabric color={c} layer={layer} /></Mesh>{cuff && <Mesh g={band}><Fabric color={cuff} layer={layer + 0.5} /></Mesh>}</Arm>)}</>;
}
function TorsoTube({ s, c, ease, y0, y1, layer, flare = 0 }: G & { ease: number; y0: number; y1: number; layer: number; flare?: number }) {
  const g = useGeos(() => [loft(ring(y0, y1, 22, (y) => { const t = flare > 0 && y < 0.8 ? { rx: s.hip.rx * 1.03, rz: s.hip.rz * 0.97, cz: 0 } : torsoAt(s, y), f = y < 0.8 ? (0.8 - y) * flare : 0; return { rx: t.rx + ease + f, rz: t.rz + ease + f * 1.15, cz: t.cz }; }), { radial: 32 })], [s, ease, y0, y1, flare]);
  return <Mesh g={g[0]!}><Fabric color={c} layer={layer} /></Mesh>;
}
function Legs({ s, c, ease, from, to, layer, taper = 0 }: G & { ease: number; from: number; to: number; layer: number; taper?: number }) {
  const g = useGeos(() => [loft(ring(to, from, 14, (y) => { const r = legR(s, y) + ease - taper * (0.9 - y); return { rx: r, rz: r * 0.95 }; }), { radial: 20 })], [s, ease, from, to, taper]);
  return <>{([1, -1] as const).map((side) => <group key={side} position={[side * s.hipX, 0, 0]}><Mesh g={g[0]!}><Fabric color={c} layer={layer} /></Mesh></group>)}</>;
}
const Box = ({ p, sz, c, r }: { p: [number, number, number]; sz: [number, number, number]; c: string; r?: [number, number, number] }) => <mesh position={p} rotation={r} castShadow><boxGeometry args={sz} /><meshStandardMaterial color={c} roughness={0.7} /></mesh>;
const frontZ = (s: BodySpec, y: number, ease: number) => torsoAt(s, y).rz + ease + (torsoAt(s, y).cz ?? 0);

function Tee({ s, c }: G) { return <><TorsoTube s={s} c={c} ease={0.011} y0={0.99} y1={1.505} layer={1} /><Sleeves s={s} c={c} ease={0.011} len={0.2} layer={1} cuff={shade(c, -0.05)} /></>; }
function Shirt({ s, c }: G) {
  return <>
    <TorsoTube s={s} c={c} ease={0.013} y0={0.9} y1={1.51} layer={1} /><Sleeves s={s} c={c} ease={0.013} len={ARM_LEN - 0.03} layer={1} cuff={shade(c, -0.06)} />
    <Box p={[0, 1.2, frontZ(s, 1.2, 0.0155)]} sz={[0.022, 0.6, 0.004]} c={shade(c, 0.07)} />
    {[1.4, 1.3, 1.2, 1.1, 1.0].map((y) => <Box key={y} p={[0, y, frontZ(s, y, 0.019)]} sz={[0.01, 0.01, 0.004]} c={shade(c, -0.25)} />)}
    <Box p={[-0.04, 1.515, frontZ(s, 1.5, 0.02) * 0.72]} sz={[0.06, 0.03, 0.01]} c={shade(c, 0.04)} r={[0.3, 0, 0.55]} /><Box p={[0.04, 1.515, frontZ(s, 1.5, 0.02) * 0.72]} sz={[0.06, 0.03, 0.01]} c={shade(c, 0.04)} r={[0.3, 0, -0.55]} />
  </>;
}
function Hoodie({ s, c }: G) {
  const hood = useGeos(() => [new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, 2.2)], []);
  return <>
    <TorsoTube s={s} c={c} ease={0.026} y0={0.9} y1={1.5} layer={2} /><Sleeves s={s} c={c} ease={0.026} len={ARM_LEN - 0.02} layer={2} cuff={shade(c, -0.07)} />
    <mesh geometry={hood[0]!} position={[0, 1.55, -0.055]} rotation={[0.35, 0, 0]} scale={[0.1, 0.085, 0.1]}><Fabric color={c} layer={2} /></mesh>
    <Box p={[0, 0.98, frontZ(s, 0.98, 0.028) - 0.004]} sz={[0.2, 0.012, 0.02]} c={shade(c, -0.07)} />
    <Box p={[0, 1.08, frontZ(s, 1.08, 0.028)]} sz={[0.22, 0.12, 0.012]} c={shade(c, -0.03)} />
  </>;
}
function Jacket({ s, c, long }: G & { long?: boolean }) {
  const y0 = long ? 0.52 : 0.86, ease = long ? 0.05 : 0.042;
  return <>
    <TorsoTube s={s} c={c} ease={ease} y0={y0} y1={1.505} layer={3} flare={long ? 0.42 : 0.03} /><Sleeves s={s} c={c} ease={ease - 0.004} len={ARM_LEN - 0.02} layer={3} cuff={shade(c, -0.06)} />
    <Box p={[0, (y0 + 1.5) / 2, frontZ(s, 1.2, ease) + 0.002]} sz={[0.014, 1.5 - y0, 0.006]} c={shade(c, -0.18)} />
    <Box p={[-0.05, 1.5, frontZ(s, 1.5, ease) * 0.7]} sz={[0.07, 0.04, 0.02]} c={shade(c, 0.03)} r={[0.3, 0, 0.5]} /><Box p={[0.05, 1.5, frontZ(s, 1.5, ease) * 0.7]} sz={[0.07, 0.04, 0.02]} c={shade(c, 0.03)} r={[0.3, 0, -0.5]} />
  </>;
}
function Suit({ s, c }: G) {
  const ease = 0.042;
  return <>
    <TorsoTube s={s} c={c} ease={ease} y0={0.78} y1={1.505} layer={3} flare={0.05} /><Sleeves s={s} c={c} ease={ease - 0.004} len={ARM_LEN - 0.02} layer={3} cuff={c} />
    <Legs s={s} c={c} ease={0.014} from={0.9} to={0.075} layer={1} /><TorsoTube s={s} c={c} ease={0.012} y0={0.71} y1={1.08} layer={1} />
    {[1, -1].map((side) => <Box key={side} p={[side * 0.06, 1.3, frontZ(s, 1.3, ease) + 0.002]} sz={[0.05, 0.36, 0.006]} c={shade(c, 0.06)} r={[0, 0, side * 0.2]} />)}
    {[1.12, 1.02].map((y) => <Box key={y} p={[0, y, frontZ(s, y, ease) + 0.004]} sz={[0.014, 0.014, 0.006]} c={shade(c, -0.2)} />)}
  </>;
}
function Trousers({ s, c }: G) { return <><Legs s={s} c={c} ease={0.012} from={0.9} to={0.075} layer={1} /><TorsoTube s={s} c={c} ease={0.01} y0={0.71} y1={1.08} layer={1} /><TorsoTube s={s} c={shade(c, -0.08)} ease={0.014} y0={1.04} y1={1.09} layer={1.5} /></>; }
function DressG({ s, c }: G) {
  const hem = 0.5;
  const g = useGeos(() => [loft([
    ...ring(1.505, 1.08, 14, (y) => { const t = torsoAt(s, y); return { rx: t.rx + 0.012, rz: t.rz + 0.012, cz: t.cz }; }),
    ...ring(1.06, hem, 14, (y) => { const t = torsoAt(s, 1.06), k = (1.06 - y) / (1.06 - hem), flare = 0.02 + k * (0.07 + s.hip.rx * 0.45); return { rx: t.rx + flare + k * 0.05, rz: t.rz + flare * 0.7 + k * 0.02 }; }),
  ].sort((a, b) => a.y - b.y), { radial: 36 })], [s]);
  return <><Mesh g={g[0]!}><Fabric color={c} layer={1} /></Mesh><Sleeves s={s} c={c} ease={0.012} len={0.12} layer={1} /></>;
}
function Shoes({ s, c }: G) {
  const [upper, sole, collar] = useGeos(() => [new THREE.SphereGeometry(1, 20, 14), new THREE.BoxGeometry(0.1, 0.03, 0.27), new THREE.CylinderGeometry(0.052, 0.05, 0.07, 16, 1, true)], []);
  return <>{([1, -1] as const).map((side) => (
    <group key={side} position={[side * s.hipX, 0, 0]}>
      <mesh geometry={upper} position={[0, 0.05, 0.05]} scale={[0.054, 0.046, 0.125]} castShadow><meshStandardMaterial color={c} roughness={0.7} /></mesh>
      <mesh geometry={collar} position={[0, 0.1, 0]}><meshStandardMaterial color={c} roughness={0.7} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={sole} position={[0, 0.015, 0.06]} castShadow><meshStandardMaterial color="#efece6" roughness={0.9} /></mesh>
    </group>))}</>;
}
function BagG({ s, c, backpack }: G & { backpack: boolean }) {
  const strapMat = <meshStandardMaterial color={shade(c, -0.12)} roughness={0.8} />;
  if (backpack) return <group><Box p={[0, 1.2, -(torsoAt(s, 1.2).rz + 0.1)]} sz={[0.3, 0.42, 0.15]} c={c} />{[1, -1].map((side) => <mesh key={side} position={[side * 0.085, 1.34, 0]}><boxGeometry args={[0.03, 0.02, torsoAt(s, 1.4).rz * 2 + 0.06]} />{strapMat}</mesh>)}</group>;
  const x = -(s.hip.rx + 0.075);
  const top = new THREE.Vector3(s.shoulder * 0.7, 1.47, 0.0), bot = new THREE.Vector3(x, 0.93, 0.02), mid = top.clone().add(bot).multiplyScalar(0.5), len = top.distanceTo(bot);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), bot.clone().sub(top).normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  const strapZ = torsoAt(s, 1.2).rz + 0.075;
  return <group>
    <Box p={[x, 0.82, 0.02]} sz={[0.1, 0.2, 0.26]} c={c} />
    <mesh position={[mid.x, mid.y, 0.0]} rotation={[0, 0, e.z]}><boxGeometry args={[0.018, len, strapZ * 2 + 0.02]} /><meshStandardMaterial transparent opacity={0} /></mesh>
    <mesh position={[mid.x * 0.97, mid.y, strapZ - 0.02]} rotation={[0, 0, e.z]}><boxGeometry args={[0.02, len, 0.006]} />{strapMat}</mesh>
    <mesh position={[mid.x * 0.97, mid.y, -strapZ + 0.02]} rotation={[0, 0, e.z]}><boxGeometry args={[0.02, len, 0.006]} />{strapMat}</mesh>
  </group>;
}
function WatchG({ s, c }: G) {
  const r = armR(s, 0.5) + 0.006, side = -1 as const;
  return <Arm s={s} side={side}><group position={[0, -0.5, 0]}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r, 0.007, 8, 24]} /><meshStandardMaterial color={shade(c, -0.05)} roughness={0.5} metalness={0.4} /></mesh>
    <mesh position={[side * (r + 0.004), 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.024, 0.024, 0.01, 20]} /><meshStandardMaterial color="#d9d6cf" roughness={0.25} metalness={0.8} /></mesh>
  </group></Arm>;
}
function GlassesG({ c }: { c: string }) {
  const m = <meshStandardMaterial color={c} roughness={0.35} metalness={0.2} />;
  return <group position={[0, HEAD.y + 0.012, HEAD.rz - 0.006]}>
    {[1, -1].map((side) => <mesh key={side} position={[side * 0.034, 0, 0]}><torusGeometry args={[0.025, 0.003, 8, 24]} />{m}</mesh>)}
    <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.0025, 0.0025, 0.02, 6]} />{m}</mesh>
    {[1, -1].map((side) => <mesh key={side} position={[side * 0.06, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.002, 0.002, 0.2, 6]} />{m}</mesh>)}
  </group>;
}

function Garment({ w, s }: { w: WornItem; s: BodySpec }) {
  const c = w.colorHex, k = w.item.kind;
  switch (k) {
    case "tee": return <Tee s={s} c={c} />;
    case "shirt": return <Shirt s={s} c={c} />;
    case "hoodie": return <Hoodie s={s} c={c} />;
    case "jacket": return <Jacket s={s} c={c} />;
    case "coat": return <Jacket s={s} c={c} long />;
    case "suit": return <Suit s={s} c={c} />;
    case "trousers": return <Trousers s={s} c={c} />;
    case "dress": return <DressG s={s} c={c} />;
    case "sneaker": return <Shoes s={s} c={c} />;
    case "bag": return <BagG s={s} c={c} backpack={w.item.bagStyle === "backpack"} />;
    case "watch": return <WatchG s={s} c={c} />;
    case "glasses": return <GlassesG c={c} />;
    default: return null;
  }
}

/** Procedural mannequin + body-fitted preview garments. Implements the contract in adapter.ts. */
export function Figure({ avatar, worn }: AvatarProps) {
  const s = BODIES[avatar.body] ?? BODIES.m1!;
  return (
    <group scale={s.height / BASE_H}>
      <Body s={s} skin={SKIN_TONES[avatar.skin] ?? SKIN_TONES[0]} />
      <Hair style={avatar.hair} color={HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0]} />
      {worn.map((w) => <Garment key={`${w.slot}:${w.item.id}`} w={w} s={s} />)}
    </group>
  );
}
