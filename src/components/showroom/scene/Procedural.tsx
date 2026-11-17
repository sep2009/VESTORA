import * as THREE from "three";
import type { ItemKind } from "@/modules/showroom/types";

export const GARMENT_KINDS: readonly ItemKind[] = ["tee", "shirt", "hoodie", "jacket", "coat", "dress", "suit", "trousers"];
export const isGarment = (k: ItemKind) => GARMENT_KINDS.includes(k);

const SKIN = "#dcd6cc";
type P = { color: string };
const Fabric = ({ color }: P) => <meshStandardMaterial color={color} roughness={0.88} />;
const darker = (c: string, f = 0.7) => `#${new THREE.Color(c).multiplyScalar(f).getHexString()}`;

/** Hanging garment. Origin = centre of the shoulder line; the garment hangs downward (-y), front faces +z. */
export function Garment({ kind, color }: { kind: ItemKind; color: string }) {
  const sleeve = (len: number, w = 0.14, d = 0.13, tilt = 0.12) => [-1, 1].map((s) => (
    <mesh key={s} position={[s * 0.33, -len / 2 + 0.02, 0]} rotation={[0, 0, s * tilt]} castShadow>
      <boxGeometry args={[w, len, d]} /><Fabric color={color} />
    </mesh>
  ));
  const body = (w: number, h: number, d: number) => (
    <mesh position={[0, -h / 2, 0]} castShadow><boxGeometry args={[w, h, d]} /><Fabric color={color} /></mesh>
  );
  switch (kind) {
    case "tee": return <group>{body(0.5, 0.68, 0.14)}{sleeve(0.22, 0.2, 0.14, 0.5)}</group>;
    case "shirt": return <group>{body(0.5, 0.85, 0.14)}{sleeve(0.62)}
      <mesh position={[0, 0, 0.03]}><boxGeometry args={[0.2, 0.05, 0.12]} /><Fabric color={darker(color, 0.9)} /></mesh></group>;
    case "hoodie": return <group>{body(0.6, 0.75, 0.2)}{sleeve(0.66, 0.18, 0.16)}
      <mesh position={[0, 0.03, -0.1]} castShadow><sphereGeometry args={[0.17, 12, 10]} /><Fabric color={darker(color)} /></mesh></group>;
    case "jacket": return <group>{body(0.58, 0.82, 0.17)}{sleeve(0.7, 0.16, 0.14)}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.1, -0.2, 0.09]}><boxGeometry args={[0.1, 0.4, 0.02]} /><Fabric color={darker(color)} /></mesh>)}</group>;
    case "coat": return <group>{body(0.62, 1.15, 0.18)}{sleeve(0.85, 0.16, 0.14)}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.1, -0.25, 0.1]}><boxGeometry args={[0.1, 0.5, 0.02]} /><Fabric color={darker(color)} /></mesh>)}</group>;
    case "dress": return <group>{body(0.4, 0.42, 0.13)}
      <mesh position={[0, -0.82, 0]} castShadow><cylinderGeometry args={[0.2, 0.46, 0.8, 18]} /><Fabric color={color} /></mesh></group>;
    case "suit": return <group>
      {body(0.58, 0.8, 0.17)}{sleeve(0.7, 0.16, 0.14)}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.1, -1.2, 0]} castShadow><cylinderGeometry args={[0.1, 0.09, 0.8, 10]} /><Fabric color={darker(color, 0.85)} /></mesh>)}</group>;
    case "trousers": return <group>
      <mesh position={[0, -0.04, 0]}><boxGeometry args={[0.4, 0.08, 0.14]} /><Fabric color={darker(color)} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.1, -0.5, 0]} castShadow><cylinderGeometry args={[0.1, 0.085, 0.85, 10]} /><Fabric color={color} /></mesh>)}</group>;
    default: return null;
  }
}

/** Small standalone objects. Origin = centre of the base on the ground. */
export function AccessoryObject({ kind, color }: { kind: ItemKind; color: string }) {
  switch (kind) {
    case "sneaker": return (
      <group>
        <mesh position={[0, 0.03, 0]} castShadow><boxGeometry args={[0.36, 0.06, 0.14]} /><meshStandardMaterial color="#f4f4f0" roughness={0.6} /></mesh>
        <mesh position={[-0.04, 0.11, 0]} castShadow><boxGeometry args={[0.24, 0.1, 0.125]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>
        <mesh position={[0.1, 0.085, 0]} castShadow><boxGeometry args={[0.12, 0.05, 0.12]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>
        <mesh position={[-0.12, 0.17, 0]}><boxGeometry args={[0.08, 0.07, 0.1]} /><meshStandardMaterial color={darker(color)} /></mesh>
      </group>);
    case "bag": return (
      <group>
        <mesh position={[0, 0.14, 0]} castShadow><boxGeometry args={[0.34, 0.26, 0.14]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
        <mesh position={[0, 0.24, 0.075]}><boxGeometry args={[0.34, 0.1, 0.012]} /><meshStandardMaterial color={darker(color)} roughness={0.5} /></mesh>
        <mesh position={[0, 0.3, 0]}><torusGeometry args={[0.09, 0.012, 8, 20, Math.PI]} /><meshStandardMaterial color={darker(color, 0.6)} /></mesh>
      </group>);
    case "watch": return (
      <group position={[0, 0.1, 0]}>
        <mesh castShadow><torusGeometry args={[0.065, 0.018, 8, 24]} /><meshStandardMaterial color="#1b1b1d" roughness={0.6} /></mesh>
        <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.058, 0.058, 0.025, 24]} /><meshStandardMaterial color={color} metalness={0.8} roughness={0.25} /></mesh>
      </group>);
    case "glasses": return (
      <group position={[0, 0.07, 0]}>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.07, 0, 0]} castShadow><torusGeometry args={[0.05, 0.008, 8, 20]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.3} /></mesh>)}
        <mesh><boxGeometry args={[0.04, 0.01, 0.01]} /><meshStandardMaterial color={color} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.12, 0, -0.07]}><boxGeometry args={[0.008, 0.008, 0.14]} /><meshStandardMaterial color={color} /></mesh>)}
      </group>);
    default: return null;
  }
}

/** Folded stack of garments, for tables and shelves. */
export function FoldedStack({ color, count = 3 }: { color: string; count?: number }) {
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[0, 0.04 + i * 0.075, 0]} rotation={[0, i % 2 ? 0.05 : -0.04, 0]} castShadow>
          <boxGeometry args={[0.42, 0.07, 0.32]} /><Fabric color={i % 2 ? darker(color, 0.92) : color} />
        </mesh>
      ))}
    </group>
  );
}

/** Mannequin figure. Standing on the floor (y=0); torso garment anchored at the shoulders. */
export function Mannequin({ kind, color, bust = false }: { kind: ItemKind; color: string; bust?: boolean }) {
  const skin = <meshStandardMaterial color={SKIN} roughness={0.5} />;
  const anchor = kind === "trousers" ? 1.0 : 1.48;
  const scale = kind === "suit" ? 0.93 : 1;
  return (
    <group>
      <mesh position={[0, 0.02, 0]} receiveShadow castShadow><cylinderGeometry args={[0.3, 0.32, 0.04, 24]} />{skin}</mesh>
      {bust ? (
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.025, 0.025, 0.9, 8]} /><meshStandardMaterial color="#444" metalness={0.6} roughness={0.4} /></mesh>
      ) : (
        <>
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.09, 0.47, 0]} castShadow><cylinderGeometry args={[0.055, 0.045, 0.9, 10]} />{skin}</mesh>)}
          {[-1, 1].map((s) => <mesh key={`a${s}`} position={[s * 0.27, 1.15, 0]} castShadow><cylinderGeometry args={[0.035, 0.03, 0.6, 8]} />{skin}</mesh>)}
        </>
      )}
      <mesh position={[0, 1.15, 0]} castShadow><cylinderGeometry args={[0.2, 0.15, 0.62, 16]} />{skin}</mesh>
      <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[0.045, 0.05, 0.12, 8]} />{skin}</mesh>
      {!bust && <mesh position={[0, 1.65, 0]} castShadow><sphereGeometry args={[0.1, 16, 12]} />{skin}</mesh>}
      <group position={[0, anchor, 0.0]} scale={scale}><Garment kind={kind} color={color} /></group>
    </group>
  );
}
