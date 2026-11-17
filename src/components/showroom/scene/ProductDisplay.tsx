"use client";
import { useRef, useState } from "react";
import type { Group } from "three";
import { useFrame } from "@react-three/fiber";
import type { ResolvedDisplay } from "@/modules/showroom/types";
import { getZone } from "@/modules/showroom/layout";
import { Html } from "@react-three/drei";
import { cameraManager } from "@/modules/showroom/camera/manager";
import { selectFocusedDisplayId, useCameraStore } from "@/stores/camera-store";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { ClothingRack } from "./ClothingRack";
import { ModelOrFallback } from "./ModelBoundary";
import { AccessoryObject, FoldedStack, Mannequin, isGarment } from "./Procedural";
import { blackSteel, brass, floor, glass, lightStrip, paint, wood } from "./pbr/materials";

const FINISH: Record<string, string> = { luxury: "#1d1d1f", formal: "#1d1d1f", minimal: "#e8e5de", accessories: "#d9d5cc" };
const finishFor = (zone: string) => FINISH[zone] ?? "#cfc9be";

function Item({ d, bust = true }: { d: ResolvedDisplay; bust?: boolean }) {
  return isGarment(d.kind)
    ? <Mannequin kind={d.kind} color={d.color} bust={bust} finish={finishFor(d.placement.departmentId)} />
    : <AccessoryObject kind={d.kind} color={d.color} />;
}

/** Plinth: matte plaster-finished block with a slim brass plinth cap. */
function Plinth({ w = 0.5, h = 1, color = "#e9e6df" }: { w?: number; h?: number; color?: string }) {
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow material={paint(color, 0.8)}><boxGeometry args={[w, h, w]} /></mesh>
      <mesh position={[0, h + 0.006, 0]} castShadow receiveShadow material={brass()}><boxGeometry args={[w + 0.02, 0.012, w + 0.02]} /></mesh>
    </group>
  );
}

function Vitrine({ w = 0.5, h = 0.5 }: { w?: number; h?: number }) {
  const f = 0.012;
  return (
    <group>
      <mesh position={[0, h / 2, 0]} material={glass()}><boxGeometry args={[w, h, w]} /></mesh>
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <mesh key={`${x}${z}`} position={[x * (w / 2), h / 2, z * (w / 2)]} castShadow material={brass()}><boxGeometry args={[f, h, f]} /></mesh>
      )))}
      <mesh position={[0, h, 0]} material={brass()} castShadow><boxGeometry args={[w + f, f, w + f]} /></mesh>
    </group>
  );
}

function Body({ d }: { d: ResolvedDisplay }) {
  const { placement: p, kind, color } = d;
  const zone = getZone(p.departmentId);
  const garment = isGarment(kind);
  const trim = zone.palette.trim;
  switch (p.type) {
    case "rack": return <ClothingRack kind={kind} color={color} />;
    case "mannequin": return <Mannequin kind={kind} color={color} finish={finishFor(p.departmentId)} />;
    case "platform": {
      const small = !garment;
      const r = small ? 0.5 : 1.0, h = small ? 0.55 : 0.18;
      return (
        <group>
          <mesh position={[0, h / 2, 0]} castShadow receiveShadow material={floor(small ? "limestone" : "terrazzo", small ? "#d9d4c8" : "#e9e5dc", 2, 2)}><cylinderGeometry args={[r, r + 0.02, h, 48]} /></mesh>
          <mesh position={[0, h + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} material={brass()}><ringGeometry args={[r - 0.025, r - 0.005, 64]} /></mesh>
          <group position={[0, h, 0]}>
            {garment ? <Mannequin kind={kind} color={color} finish={finishFor(p.departmentId)} /> : (
              <>
                <group position={[-0.07, 0, 0.06]} rotation={[0, 0.5, 0]}><AccessoryObject kind={kind} color={color} /></group>
                <group position={[0.08, 0, -0.07]} rotation={[0, -2.6, 0]}><AccessoryObject kind={kind} color={color} /></group>
              </>
            )}
          </group>
        </group>
      );
    }
    case "pedestal":
      return (
        <group>
          <Plinth w={0.5} h={1} color={zone.id === "accessories" ? "#d9d5cc" : "#e9e6df"} />
          <group position={[0, 1.012, 0]}>
            <Item d={d} />
            {p.glass && <Vitrine w={0.52} h={garment ? 1.05 : 0.42} />}
          </group>
        </group>
      );
    case "table":
      return (
        <group>
          <mesh position={[0, 0.77, 0]} castShadow receiveShadow material={wood("walnut", "#6b4a31", 1.6, 0.9)}><boxGeometry args={[1.6, 0.04, 0.9]} /></mesh>
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * 0.74, 0.375, sz * 0.4]} castShadow material={blackSteel()}><boxGeometry args={[0.035, 0.75, 0.035]} /></mesh>
          )))}
          <group position={[0, 0.79, 0]}>
            {[-0.5, 0, 0.5].map((x, i) => (
              <group key={x} position={[x, 0, i === 1 ? -0.04 : 0.05]} rotation={[0, (i - 1) * 0.18, 0]}>
                {garment ? <FoldedStack color={color} count={3 + (i % 2)} /> : <AccessoryObject kind={kind} color={color} />}
              </group>
            ))}
          </group>
        </group>
      );
    case "shelf":
      return (
        <group>
          <mesh position={[0, 1.05, -0.19]} castShadow receiveShadow material={wood("oak", "#b99a73", 1.9, 2.1)}><boxGeometry args={[1.9, 2.1, 0.03]} /></mesh>
          {[-0.95, 0.95].map((x) => <mesh key={x} position={[x, 1.05, 0]} castShadow material={blackSteel()}><boxGeometry args={[0.03, 2.1, 0.4]} /></mesh>)}
          {[0.35, 1.0, 1.65].map((y) => (
            <group key={y}>
              <mesh position={[0, y, 0]} castShadow receiveShadow material={wood("oak", "#c6a982", 1.9, 0.4)}><boxGeometry args={[1.88, 0.03, 0.38]} /></mesh>
              {[-0.55, 0, 0.55].map((x, i) => (
                <group key={x} position={[x, y + 0.015, 0.02]} rotation={[0, (i - 1) * 0.12, 0]}>
                  {garment ? <FoldedStack color={color} count={2} /> : <AccessoryObject kind={kind} color={color} />}
                </group>
              ))}
            </group>
          ))}
        </group>
      );
    case "niche":
      return (
        <group>
          <mesh position={[0, 0, -0.05]} material={paint("#161617", 0.6)} castShadow><boxGeometry args={[1.3, 1.3, 0.1]} /></mesh>
          <mesh position={[0, 0, 0.002]} material={lightStrip("#ffe4bd", 0.55)}><planeGeometry args={[1.14, 1.14]} /></mesh>
          <mesh position={[0, -0.42, 0.08]} castShadow receiveShadow material={floor("limestone", "#d9d4c8", 1, 1)}><boxGeometry args={[0.9, 0.03, 0.22]} /></mesh>
          <group position={[0, -0.405, 0.08]}><AccessoryObject kind={kind} color={color} /></group>
        </group>
      );
  }
}

/** One placed display. Shows a GLB when the product has a model, otherwise a procedural placeholder. */
export function ProductDisplay({ display }: { display: ResolvedDisplay }) {
  const { placement: p, product } = display;
  const selected = useCameraStore((s) => selectFocusedDisplayId(s) === p.id);
  const [hover, setHover] = useState(false);
  const spinRef = useRef<Group>(null);
  const hoverRef = useRef<Group>(null);
  const reduced = useReducedMotion();
  const zone = getZone(p.departmentId);

  useFrame((_, dt) => {
    if (p.spin && !reduced && spinRef.current) spinRef.current.rotation.y += dt * 0.35;
    const g = hoverRef.current;
    if (g) { const target = hover && !selected ? 1.05 : 1; const k = reduced ? 1 : 1 - Math.exp(-dt * 12); g.scale.setScalar(g.scale.x + (target - g.scale.x) * k); }
  });
  const setHovered = (on: boolean) => {
    setHover(on);
    useCameraStore.setState({ hoverDisplayId: on ? p.id : (useCameraStore.getState().hoverDisplayId === p.id ? null : useCameraStore.getState().hoverDisplayId) });
    document.body.style.cursor = on ? "pointer" : "";
  };

  const procedural = <Body d={display} />;
  const body = product.modelUrl && p.type !== "niche" ? (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow material={floor("limestone", "#e2ddd1", 2, 2)}><cylinderGeometry args={[0.9, 0.95, 0.3, 40]} /></mesh>
      <group position={[0, 0.3, 0]}><ModelOrFallback url={product.modelUrl} height={1.5} fallback={<Item d={display} />} /></group>
    </group>
  ) : procedural;

  return (
    <group
      position={[...p.position]} rotation={[...p.rotation]} scale={p.scale}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); cameraManager.focusDisplay(p.id); }}
    >
      <group ref={hoverRef}><group ref={spinRef}>{body}</group></group>
      {hover && !selected && (
        <Html position={[0, p.type === "niche" ? 1 : 2.5, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-sm bg-ink px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-paper shadow-pop">{product.name}</div>
        </Html>
      )}
      {(hover || selected) && p.type !== "niche" && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.25, 1.29, 64]} />
          <meshBasicMaterial color={selected ? "#f3e9d2" : "#ffffff"} transparent opacity={selected ? 0.95 : 0.6} />
        </mesh>
      )}
    </group>
  );
}
