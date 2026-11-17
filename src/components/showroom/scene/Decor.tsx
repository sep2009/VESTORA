"use client";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { ZoneId, ZonePalette } from "@/modules/showroom/types";
import { leafGeometry } from "./pbr/geometry";
import { blackSteel, brass, brushedMetal, fabric, floor, leather, lightStrip, paint, surface, wood, wool } from "./pbr/materials";

type V3 = readonly [number, number, number];

/** Potted fiddle-leaf plant: concrete pot, woody stem, instanced leaves in natural greens. */
export function Plant({ position, scale = 1, seed = 1 }: { position: V3; scale?: number; seed?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const leaves = useMemo(() => {
    let s = seed * 9301 + 49297; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: 26 }, (_, i) => {
      const h = 0.7 + (i / 26) * 0.95, a = r() * Math.PI * 2, tilt = 0.5 + r() * 0.7, sc = 0.7 + r() * 0.5;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, a, 0, "YXZ"));
      const c = new THREE.Color().setHSL(0.3 + r() * 0.04, 0.38, 0.17 + r() * 0.08);
      return { m: new THREE.Matrix4().compose(new THREE.Vector3(0, h, 0), q, new THREE.Vector3(sc, sc, sc)), c };
    });
  }, [seed]);
  useLayoutEffect(() => {
    leaves.forEach((l, i) => { ref.current!.setMatrixAt(i, l.m); ref.current!.setColorAt(i, l.c); });
    ref.current!.instanceMatrix.needsUpdate = true; ref.current!.instanceColor!.needsUpdate = true;
  }, [leaves]);
  return (
    <group position={[...position]} scale={scale}>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow material={surface("concrete", "#b9b5ac", 0.8, 0.8)}><cylinderGeometry args={[0.3, 0.24, 0.56, 28]} /></mesh>
      <mesh position={[0, 0.54, 0]} material={paint("#2a2118", 1)}><cylinderGeometry args={[0.27, 0.27, 0.03, 24]} /></mesh>
      <mesh position={[0, 1.1, 0]} castShadow material={paint("#5b4630", 0.9)}><cylinderGeometry args={[0.018, 0.03, 1.1, 8]} /></mesh>
      <instancedMesh ref={ref} args={[leafGeometry(), paint("#ffffff", 0.55), leaves.length]} castShadow receiveShadow />
    </group>
  );
}

export function Bench({ position, rotationY = 0, color = "#3a2a20", length = 2.2 }: { position: V3; rotationY?: number; color?: string; length?: number }) {
  return (
    <group position={[...position]} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[length, 0.1, 0.55]} radius={0.04} smoothness={3} position={[0, 0.43, 0]} castShadow receiveShadow material={leather(color)} />
      <mesh position={[0, 0.375, 0]} castShadow material={blackSteel()}><boxGeometry args={[length - 0.1, 0.03, 0.45]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (length / 2 - 0.12), 0.18, 0]} castShadow material={blackSteel()}><boxGeometry args={[0.035, 0.36, 0.45]} /></mesh>)}
    </group>
  );
}

export function Sofa({ position, rotationY = 0, color = "#8a8f86" }: { position: V3; rotationY?: number; color?: string }) {
  const m = fabric(color);
  return (
    <group position={[...position]} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[2.4, 0.34, 0.95]} radius={0.06} smoothness={4} position={[0, 0.3, 0]} castShadow receiveShadow material={m} />
      <RoundedBox args={[2.4, 0.5, 0.22]} radius={0.08} smoothness={4} position={[0, 0.62, -0.36]} castShadow receiveShadow material={m} />
      {[-1, 1].map((s) => <RoundedBox key={s} args={[0.2, 0.28, 0.95]} radius={0.07} smoothness={4} position={[s * 1.1, 0.58, 0]} castShadow material={m} />)}
      {[-1, 1].map((s) => <mesh key={`l${s}`} position={[s * 1.05, 0.06, 0.38]} castShadow material={blackSteel()}><cylinderGeometry args={[0.02, 0.016, 0.12, 8]} /></mesh>)}
    </group>
  );
}

export function Armchair({ position, rotationY = 0, color = "#3a2a20" }: { position: V3; rotationY?: number; color?: string }) {
  const m = leather(color);
  return (
    <group position={[...position]} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[0.8, 0.3, 0.78]} radius={0.07} smoothness={4} position={[0, 0.28, 0]} castShadow receiveShadow material={m} />
      <RoundedBox args={[0.8, 0.5, 0.18]} radius={0.07} smoothness={4} position={[0, 0.62, -0.3]} castShadow material={m} />
      {[-1, 1].map((s) => <RoundedBox key={s} args={[0.14, 0.26, 0.78]} radius={0.05} smoothness={3} position={[s * 0.34, 0.5, 0]} castShadow material={m} />)}
    </group>
  );
}

export function Rug({ position, size, round = false, color, border }: { position: V3; size: readonly [number, number]; round?: boolean; color: string; border?: string }) {
  const m = wool(color, size[0], size[1]);
  return (
    <group position={[...position]}>
      {round ? (
        <>
          {border && <mesh position={[0, 0.006, 0]} receiveShadow material={wool(border, size[0], size[0])}><cylinderGeometry args={[size[0] / 2 + 0.1, size[0] / 2 + 0.1, 0.012, 56]} /></mesh>}
          <mesh position={[0, 0.011, 0]} receiveShadow material={m}><cylinderGeometry args={[size[0] / 2, size[0] / 2, 0.012, 56]} /></mesh>
        </>
      ) : (
        <>
          {border && <mesh position={[0, 0.006, 0]} receiveShadow material={wool(border, size[0] + 0.2, size[1] + 0.2)}><boxGeometry args={[size[0] + 0.2, 0.012, size[1] + 0.2]} /></mesh>}
          <mesh position={[0, 0.011, 0]} receiveShadow material={m}><boxGeometry args={[size[0], 0.012, size[1]]} /></mesh>
        </>
      )}
    </group>
  );
}

/** Slim brass ring pendant with small warm lamps: a considered fixture, not a glowing chandelier. */
function RingPendant({ position, radius = 0.9, count = 10 }: { position: V3; radius?: number; count?: number }) {
  return (
    <group position={[...position]}>
      {[-1, 1].map((s) => <mesh key={s} position={[s * radius * 0.7, 0.9, 0]} material={blackSteel()}><cylinderGeometry args={[0.004, 0.004, 1.8, 4]} /></mesh>)}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow material={brass()}><torusGeometry args={[radius, 0.014, 10, 64]} /></mesh>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]}>
            <mesh position={[0, -0.025, 0]} castShadow material={brass()}><cylinderGeometry args={[0.012, 0.018, 0.04, 8]} /></mesh>
            <mesh position={[0, -0.06, 0]} material={lightStrip("#ffd9a0", 1.0)}><sphereGeometry args={[0.026, 12, 10]} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

function Column({ position, cap }: { position: V3; cap: string }) {
  void cap;
  return (
    <group position={[...position]}>
      <mesh position={[0, 2.75, 0]} castShadow receiveShadow material={floor("marble", "#ddd7ca", 1, 5.5)}><cylinderGeometry args={[0.34, 0.36, 5.5, 32]} /></mesh>
      <mesh position={[0, 0.1, 0]} castShadow material={brass()}><cylinderGeometry args={[0.4, 0.4, 0.2, 32]} /></mesh>
      <mesh position={[0, 5.35, 0]} castShadow material={brass()}><cylinderGeometry args={[0.4, 0.4, 0.2, 32]} /></mesh>
    </group>
  );
}

function Pendant({ position }: { position: V3 }) {
  return (
    <group position={[...position]}>
      <mesh position={[0, 0.9, 0]} material={blackSteel()}><cylinderGeometry args={[0.004, 0.004, 1.8, 4]} /></mesh>
      <mesh castShadow material={brass()}><coneGeometry args={[0.2, 0.2, 28, 1, true]} /></mesh>
      <mesh position={[0, -0.04, 0]} rotation={[Math.PI, 0, 0]} material={lightStrip("#ffe2b5", 0.9)}><circleGeometry args={[0.17, 24]} /></mesh>
    </group>
  );
}

const Crate = ({ position, rot = 0 }: { position: V3; rot?: number }) => (
  <group position={[...position]} rotation={[0, rot, 0]}>
    <mesh position={[0, 0.35, 0]} castShadow receiveShadow material={paint("#1c1c1e", 0.55)}><boxGeometry args={[1, 0.7, 0.6]} /></mesh>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <mesh key={`${x}${z}`} position={[x * 0.49, 0.35, z * 0.29]} castShadow material={brushedMetal("#b9bcc0")}><boxGeometry args={[0.03, 0.72, 0.03]} /></mesh>))}
  </group>
);

/** Zone-specific architecture and furniture that is not a product display. Local coordinates, zone centre = origin. */
export function ZoneDecor({ id, palette }: { id: ZoneId; palette: ZonePalette }) {
  switch (id) {
    case "luxury": return (
      <group>
        <Column position={[-7.1, 0, -7.1]} cap={palette.trim} /><Column position={[7.1, 0, -7.1]} cap={palette.trim} />
        <RingPendant position={[0, 4.5, 0.5]} />
        <Rug position={[0.2, 0, 1.2]} size={[4.6, 4.6]} round color="#4f2a2f" border="#b08d57" />
        <Bench position={[0.3, 0, 4.4]} color="#5a2a30" length={2.6} />
        <mesh position={[0, 0.006, 1]} rotation={[-Math.PI / 2, 0, 0]} material={brass()}><planeGeometry args={[0.04, 15]} /></mesh>
        <Plant position={[6.9, 0, 6.2]} seed={3} />
      </group>);
    case "streetwear": return (
      <group>
        {[-5.2, 5.2].map((x) => (
          <group key={x} position={[x, 4.1, -7.45]}>
            <mesh castShadow material={blackSteel()}><boxGeometry args={[2.6, 0.18, 0.08]} /></mesh>
            <mesh position={[0, 0, 0.045]} material={lightStrip("#fff0d6", 0.9)}><boxGeometry args={[2.5, 0.12, 0.01]} /></mesh>
          </group>
        ))}
        <Crate position={[6.4, 0, 5.4]} /><Crate position={[6.4, 0.7, 5.4]} rot={0.2} /><Crate position={[5.2, 0, 6.4]} rot={-0.15} />
        <Bench position={[-2, 0, 4.4]} color="#2a2a2c" />
        <mesh position={[0, 0.006, 2.2]} rotation={[-Math.PI / 2, 0, 0]} material={paint("#bdbab2", 0.9)}><planeGeometry args={[12, 0.18]} /></mesh>
      </group>);
    case "sportswear": return (
      <group>
        <mesh position={[0, 4.6, 0]} castShadow material={blackSteel()}><boxGeometry args={[9, 0.05, 0.12]} /></mesh>
        <mesh position={[0, 4.575, 0]} material={lightStrip("#fff2de", 1.1)}><boxGeometry args={[8.9, 0.01, 0.09]} /></mesh>
        {[-3.2, 3.2].map((x) => <mesh key={x} position={[x, 4.95, 0]} material={blackSteel()}><cylinderGeometry args={[0.004, 0.004, 0.7, 4]} /></mesh>)}
        <mesh position={[-2.2, 0.25, 4.4]} castShadow receiveShadow material={floor("limestone", "#e0ddd5", 0.9, 0.9)}><boxGeometry args={[0.9, 0.5, 0.9]} /></mesh>
        <mesh position={[-2.2, 0.85, 4.4]} castShadow material={brushedMetal("#8e8a82")}><sphereGeometry args={[0.32, 40, 28]} /></mesh>
        <Bench position={[3.2, 0, -2.6]} color="#cfcac0" length={2.8} />
        <Plant position={[7, 0, 6.4]} seed={5} />
      </group>);
    case "casual": return (
      <group>
        <Plant position={[-7, 0, -7.1]} scale={1.25} seed={2} /><Plant position={[7, 0, -7.1]} scale={1.25} seed={4} /><Plant position={[7, 0, 5.8]} seed={6} />
        <Sofa position={[-4.6, 0, 5.4]} color="#86907f" />
        <Rug position={[-1.5, 0, 4.4]} size={[4.4, 2.8]} color="#d2c7b3" border="#a98c66" />
        {Array.from({ length: 15 }, (_, i) => {
          const x = -6 + i * (12 / 14);
          return <mesh key={i} position={[x, 3.7 - Math.sin((i / 14) * Math.PI) * 0.3, -7.4]} material={lightStrip("#ffd9a0", 1.0)}><sphereGeometry args={[0.05, 10, 8]} /></mesh>;
        })}
        <mesh position={[0, 0.4, 2.6]} castShadow receiveShadow material={wood("oak", "#bf9d72", 1.2, 1.2)}><cylinderGeometry args={[0.55, 0.55, 0.04, 36]} /></mesh>
        <mesh position={[0, 0.19, 2.6]} castShadow material={blackSteel()}><cylinderGeometry args={[0.03, 0.03, 0.38, 10]} /></mesh>
      </group>);
    case "formal": return (
      <group>
        {[-5.6, -2.8, 2.8, 5.6].map((x) => <mesh key={x} position={[x, 2.2, -7.5]} castShadow receiveShadow material={paint("#2e374c", 0.55)}><boxGeometry args={[0.4, 4.4, 0.2]} /></mesh>)}
        <Rug position={[0, 0, 0]} size={[2.4, 14]} color="#5a1f2a" border="#b08d57" />
        <RingPendant position={[0, 4.5, 0.5]} radius={1.0} count={12} />
        <Armchair position={[-5.6, 0, 4.8]} rotationY={0.5} /><Armchair position={[5.6, 0, 4.8]} rotationY={-0.5} />
      </group>);
    case "accessories": return (
      <group>
        {[[-3.5, 0], [0, 0.8], [3.5, 0], [5.6, 3.6]].map(([x, z]) => <Pendant key={`${x}${z}`} position={[x!, 4, z!]} />)}
        <mesh position={[0, 4.6, -7.5]} material={lightStrip("#ffe2b5", 1.0)}><boxGeometry args={[12, 0.03, 0.08]} /></mesh>
        <Plant position={[7, 0, -7]} scale={0.9} seed={7} />
      </group>);
    case "new-arrivals": return (
      <group>
        <mesh position={[0, 4.9, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow material={blackSteel()}><torusGeometry args={[3.4, 0.05, 12, 72]} /></mesh>
        <mesh position={[0, 4.865, 0]} rotation={[Math.PI / 2, 0, 0]} material={lightStrip("#fff4e2", 1.1)}><torusGeometry args={[3.4, 0.028, 8, 72]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 3.4, 5.4, 0]} material={blackSteel()}><cylinderGeometry args={[0.004, 0.004, 1, 4]} /></mesh>)}
        <mesh position={[0, 0.006, -0.4]} rotation={[-Math.PI / 2, 0, 0]} material={brass()}><ringGeometry args={[2.55, 2.6, 72]} /></mesh>
        <mesh position={[0, 0.006, -0.4]} rotation={[-Math.PI / 2, 0, 0]} material={brass()}><ringGeometry args={[1.95, 1.98, 72]} /></mesh>
      </group>);
    case "entrance": return (
      <group>
        <mesh position={[-4.4, 0.5, -3]} castShadow receiveShadow material={wood("walnut", "#5d412c", 3.2, 1.0)}><boxGeometry args={[3.2, 1.0, 0.9]} /></mesh>
        <mesh position={[-4.4, 1.03, -3]} castShadow receiveShadow material={floor("marble", "#ddd7ca", 3.3, 1)}><boxGeometry args={[3.3, 0.06, 1.0]} /></mesh>
        <Plant position={[-7, 0, -7]} seed={8} /><Plant position={[7, 0, -7]} seed={9} />
        <Bench position={[-5, 0, 4.4]} color="#2a2a2c" /><Bench position={[5, 0, 4.4]} color="#2a2a2c" />
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} material={brass()}><planeGeometry args={[0.05, 16]} /></mesh>
      </group>);
    case "sneakers": return (
      <group>
        <Bench position={[-4.2, 0, 2.6]} color="#1f1f21" length={2.4} /><Bench position={[4.2, 0, 2.6]} color="#1f1f21" length={2.4} />
        <mesh position={[0, 4.55, 0.5]} castShadow material={blackSteel()}><boxGeometry args={[9, 0.05, 0.12]} /></mesh>
        <mesh position={[0, 4.525, 0.5]} material={lightStrip("#fff0d6", 1.1)}><boxGeometry args={[8.9, 0.01, 0.09]} /></mesh>
        <mesh position={[0, 0.006, 0.6]} rotation={[-Math.PI / 2, 0, 0]} material={brass()}><planeGeometry args={[0.04, 12]} /></mesh>
        <Plant position={[7, 0, -7]} seed={12} />
      </group>);
    case "denim": return (
      <group>
        <Rug position={[0, 0, 1.4]} size={[4.2, 2.8]} color="#2f3f5c" border="#8a6a48" />
        <Bench position={[0.2, 0, 4.4]} color="#6b4a31" length={2.6} />
        {[-3, 3].map((x) => <Pendant key={x} position={[x, 4, 0.4]} />)}
        <Plant position={[7, 0, 5.8]} seed={13} /><Plant position={[-7, 0, 5.8]} seed={14} />
      </group>);
  }
}
