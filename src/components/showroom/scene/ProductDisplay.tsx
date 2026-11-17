"use client";
import { useRef, useState } from "react";
import type { Group } from "three";
import { useFrame } from "@react-three/fiber";
import type { ResolvedDisplay } from "@/modules/showroom/types";
import { getZone } from "@/modules/showroom/layout";
import { useShowroom } from "@/stores/showroom-store";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { ClothingRack } from "./ClothingRack";
import { ModelOrFallback } from "./ModelBoundary";
import { AccessoryObject, FoldedStack, Mannequin, isGarment } from "./Procedural";

function Item({ d, scale = 1 }: { d: ResolvedDisplay; scale?: number }) {
  return isGarment(d.kind)
    ? <Mannequin kind={d.kind} color={d.color} bust />
    : <group scale={scale}><AccessoryObject kind={d.kind} color={d.color} /></group>;
}

function Plinth({ w = 0.8, h = 0.9, color }: { w?: number; h?: number; color: string }) {
  return <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, h, w]} /><meshStandardMaterial color={color} roughness={0.45} /></mesh>;
}

function Body({ d }: { d: ResolvedDisplay }) {
  const { placement: p, kind, color } = d;
  const zone = getZone(p.departmentId);
  const garment = isGarment(kind);
  switch (p.type) {
    case "rack": return <ClothingRack kind={kind} color={color} />;
    case "mannequin": return <Mannequin kind={kind} color={color} />;
    case "platform":
      return (
        <group>
          <mesh position={[0, 0.15, 0]} castShadow receiveShadow><cylinderGeometry args={[1.05, 1.1, 0.3, 40]} /><meshStandardMaterial color="#f4f2ee" roughness={0.4} /></mesh>
          <mesh position={[0, 0.305, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.98, 1.04, 48]} /><meshStandardMaterial color={zone.palette.accent} emissive={zone.palette.accent} emissiveIntensity={0.6} /></mesh>
          <group position={[0, 0.3, 0]}>
            {garment ? <Mannequin kind={kind} color={color} /> : <group scale={3.2}><AccessoryObject kind={kind} color={color} /></group>}
          </group>
        </group>
      );
    case "pedestal":
      return (
        <group>
          <Plinth color="#f2f0ec" />
          <group position={[0, 0.9, 0]}><Item d={d} scale={garment ? 1 : 3.4} /></group>
          {p.glass && (
            <mesh position={[0, 0.9 + (garment ? 0.55 : 0.28), 0]}>
              <boxGeometry args={[0.8, garment ? 1.1 : 0.56, 0.8]} />
              <meshStandardMaterial color="#cfe9ef" transparent opacity={0.18} roughness={0.05} metalness={0.1} depthWrite={false} />
            </mesh>
          )}
        </group>
      );
    case "table":
      return (
        <group>
          <mesh position={[0, 0.78, 0]} castShadow receiveShadow><boxGeometry args={[1.6, 0.07, 1.05]} /><meshStandardMaterial color={zone.palette.trim} roughness={0.5} /></mesh>
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * 0.72, 0.38, sz * 0.45]} castShadow><boxGeometry args={[0.06, 0.76, 0.06]} /><meshStandardMaterial color="#2a2a2a" /></mesh>
          )))}
          <group position={[0, 0.815, 0]}>
            {[-0.5, 0, 0.5].map((x, i) => (
              <group key={x} position={[x, 0, i === 1 ? -0.05 : 0.05]}>
                {garment ? <FoldedStack color={color} count={3 + (i % 2)} /> : <group scale={2.6}><AccessoryObject kind={kind} color={color} /></group>}
              </group>
            ))}
          </group>
        </group>
      );
    case "shelf":
      return (
        <group>
          <mesh position={[0, 1.05, -0.18]} castShadow receiveShadow><boxGeometry args={[1.9, 2.1, 0.05]} /><meshStandardMaterial color={zone.palette.trim} roughness={0.55} /></mesh>
          {[-0.95, 0.95].map((x) => <mesh key={x} position={[x, 1.05, 0]} castShadow><boxGeometry args={[0.05, 2.1, 0.45]} /><meshStandardMaterial color={zone.palette.trim} roughness={0.55} /></mesh>)}
          {[0.35, 1.0, 1.65].map((y) => (
            <group key={y}>
              <mesh position={[0, y, 0]} castShadow receiveShadow><boxGeometry args={[1.9, 0.04, 0.45]} /><meshStandardMaterial color="#efeae0" roughness={0.5} /></mesh>
              {[-0.55, 0, 0.55].map((x) => (
                <group key={x} position={[x, y + 0.02, 0.02]}>
                  {garment ? <FoldedStack color={color} count={2} /> : <group scale={2.1}><AccessoryObject kind={kind} color={color} /></group>}
                </group>
              ))}
            </group>
          ))}
        </group>
      );
    case "niche":
      return (
        <group>
          <mesh position={[0, 0, -0.05]}><boxGeometry args={[1.3, 1.3, 0.12]} /><meshStandardMaterial color="#17171a" /></mesh>
          <mesh position={[0, 0, 0.02]}><planeGeometry args={[1.1, 1.1]} /><meshStandardMaterial color="#fffaf0" emissive="#fff1d0" emissiveIntensity={0.55} /></mesh>
          <mesh position={[0, -0.42, 0.12]} castShadow><boxGeometry args={[0.9, 0.04, 0.3]} /><meshStandardMaterial color="#e8e2d6" /></mesh>
          <group position={[0, -0.4, 0.12]}><group scale={2.4}><AccessoryObject kind={kind} color={color} /></group></group>
        </group>
      );
  }
}

/** One placed display. Shows a GLB when the product has a model, otherwise a procedural placeholder. */
export function ProductDisplay({ display }: { display: ResolvedDisplay }) {
  const { placement: p, product } = display;
  const selected = useShowroom((s) => s.focusedDisplayId === p.id);
  const focus = useShowroom((s) => s.focusDisplay);
  const [hover, setHover] = useState(false);
  const spinRef = useRef<Group>(null);
  const reduced = useReducedMotion();
  const zone = getZone(p.departmentId);

  useFrame((_, dt) => { if (p.spin && !reduced && spinRef.current) spinRef.current.rotation.y += dt * 0.35; });

  const procedural = <Body d={display} />;
  const body = product.modelUrl && p.type !== "niche" ? (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow><cylinderGeometry args={[0.9, 0.95, 0.3, 32]} /><meshStandardMaterial color="#f4f2ee" roughness={0.4} /></mesh>
      <group position={[0, 0.3, 0]}><ModelOrFallback url={product.modelUrl} height={1.5} fallback={<Item d={display} />} /></group>
    </group>
  ) : procedural;

  return (
    <group
      position={[...p.position]} rotation={[...p.rotation]} scale={p.scale}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}
      onClick={(e) => { e.stopPropagation(); focus(selected ? null : p.id); }}
    >
      <group ref={spinRef}>{body}</group>
      {(hover || selected) && p.type !== "niche" && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.25, 1.35, 48]} />
          <meshBasicMaterial color={selected ? zone.palette.accent : "#ffffff"} transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}
