"use client";
import { useRef, useState } from "react";
import type { ThreeElements } from "@react-three/fiber";
import type { Group } from "three";
import { useFrame } from "@react-three/fiber";
import type { MallProduct, ResolvedDisplay } from "@/modules/showroom/types";
import { getZone } from "@/modules/showroom/layout";
import { Html } from "@react-three/drei";
import { cameraManager } from "@/modules/showroom/camera/manager";
import { selectFocusedProductId, useCameraStore } from "@/stores/camera-store";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { ClothingRack } from "./ClothingRack";
import { ModelOrFallback } from "./ModelBoundary";
import { AccessoryObject, FoldedStack, Mannequin, isGarment } from "./Procedural";
import { blackSteel, brass, floor, glass, lightStrip, paint, wood } from "./pbr/materials";

const FINISH: Record<string, string> = { luxury: "#1d1d1f", formal: "#1d1d1f", sportswear: "#e8e5de", accessories: "#d9d5cc" };
const finishFor = (zone: string) => FINISH[zone] ?? "#cfc9be";
const isGarmentProduct = (p: MallProduct) => isGarment(p.kind);

/** One product placed on a fixture. Garments are shown on a form, footwear and accessories at true size. */
function ProductItem({ p, zone, bust = true }: { p: MallProduct; zone: string; bust?: boolean }) {
  return isGarmentProduct(p)
    ? <Mannequin kind={p.kind} color={p.color} bust={bust} finish={finishFor(zone)} />
    : <AccessoryObject kind={p.kind} color={p.color} />;
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

type Handlers = { hover: (id: string | null) => void; pick: (id: string) => void };

/** Wraps one product so that hovering and clicking it targets exactly that catalog product. */
function Pickable({ pid, h, children, ...pos }: { pid: string; h: Handlers; children: React.ReactNode } & Omit<ThreeElements["group"], "children">) {
  return (
    <group
      {...pos}
      onPointerOver={(e) => { e.stopPropagation(); h.hover(pid); }}
      onPointerOut={() => h.hover(null)}
      onClick={(e) => { e.stopPropagation(); h.pick(pid); }}
    >{children}</group>
  );
}

function Body({ display, h }: { display: ResolvedDisplay; h: Handlers }) {
  const { slot, products } = display;
  const zone = getZone(slot.departmentId);
  const first = products[0]!;
  const garment = isGarmentProduct(first);
  switch (slot.type) {
    case "rack":
      return <ClothingRack items={products.map((p) => ({ id: p.id, kind: p.kind, color: p.color }))} onHover={h.hover} onPick={h.pick} />;
    case "mannequin":
      return <Pickable pid={first.id} h={h}><Mannequin kind={first.kind} color={first.color} finish={finishFor(slot.departmentId)} /></Pickable>;
    case "platform": {
      const small = !garment;
      const r = small ? 0.5 : 1.0, ph = small ? 0.55 : 0.18;
      return (
        <Pickable pid={first.id} h={h}>
          <mesh position={[0, ph / 2, 0]} castShadow receiveShadow material={floor(small ? "limestone" : "terrazzo", small ? "#d9d4c8" : "#e9e5dc", 2, 2)}><cylinderGeometry args={[r, r + 0.02, ph, 48]} /></mesh>
          <mesh position={[0, ph + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} material={brass()}><ringGeometry args={[r - 0.025, r - 0.005, 64]} /></mesh>
          <group position={[0, ph, 0]}>
            {garment ? <Mannequin kind={first.kind} color={first.color} finish={finishFor(slot.departmentId)} /> : (
              <>
                <group position={[-0.07, 0, 0.06]} rotation={[0, 0.5, 0]}><AccessoryObject kind={first.kind} color={first.color} /></group>
                <group position={[0.08, 0, -0.07]} rotation={[0, -2.6, 0]}><AccessoryObject kind={first.kind} color={first.color} /></group>
              </>
            )}
          </group>
        </Pickable>
      );
    }
    case "pedestal":
      return (
        <Pickable pid={first.id} h={h}>
          <Plinth w={0.5} h={1} color={zone.id === "accessories" ? "#d9d5cc" : "#e9e6df"} />
          <group position={[0, 1.012, 0]}>
            <ProductItem p={first} zone={slot.departmentId} />
            {slot.glass && <Vitrine w={0.52} h={garment ? 1.05 : 0.42} />}
          </group>
        </Pickable>
      );
    case "table":
      return (
        <group>
          <mesh position={[0, 0.77, 0]} castShadow receiveShadow material={wood("walnut", "#6b4a31", 1.6, 0.9)}><boxGeometry args={[1.6, 0.04, 0.9]} /></mesh>
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * 0.74, 0.375, sz * 0.4]} castShadow material={blackSteel()}><boxGeometry args={[0.035, 0.75, 0.035]} /></mesh>
          )))}
          {products.slice(0, 3).map((p, i, arr) => (
            <Pickable key={p.id} pid={p.id} h={h} position={[(i - (arr.length - 1) / 2) * 0.5, 0.79, i === 1 ? -0.04 : 0.05]} rotation={[0, (i - 1) * 0.18, 0]}>
              {isGarmentProduct(p) ? <FoldedStack color={p.color} count={3} /> : <AccessoryObject kind={p.kind} color={p.color} />}
            </Pickable>
          ))}
        </group>
      );
    case "shelf":
      return (
        <group>
          <mesh position={[0, 1.05, -0.19]} castShadow receiveShadow material={wood("oak", "#b99a73", 1.9, 2.1)}><boxGeometry args={[1.9, 2.1, 0.03]} /></mesh>
          {[-0.95, 0.95].map((x) => <mesh key={x} position={[x, 1.05, 0]} castShadow material={blackSteel()}><boxGeometry args={[0.03, 2.1, 0.4]} /></mesh>)}
          {[0.35, 1.0, 1.65].map((y) => (
            <mesh key={y} position={[0, y, 0]} castShadow receiveShadow material={wood("oak", "#c6a982", 1.9, 0.4)}><boxGeometry args={[1.88, 0.03, 0.38]} /></mesh>
          ))}
          {products.slice(0, 6).map((p, i) => (
            <Pickable key={p.id} pid={p.id} h={h} position={[i % 2 === 0 ? -0.45 : 0.45, [0.35, 1.0, 1.65][Math.floor(i / 2)]! + 0.015, 0.02]} rotation={[0, ((i % 3) - 1) * 0.12, 0]}>
              {isGarmentProduct(p) ? <FoldedStack color={p.color} count={2} /> : <AccessoryObject kind={p.kind} color={p.color} />}
            </Pickable>
          ))}
        </group>
      );
    case "niche":
      return (
        <Pickable pid={first.id} h={h}>
          <mesh position={[0, 0, -0.05]} material={paint("#161617", 0.6)} castShadow><boxGeometry args={[1.3, 1.3, 0.1]} /></mesh>
          <mesh position={[0, 0, 0.002]} material={lightStrip("#ffe4bd", 0.55)}><planeGeometry args={[1.14, 1.14]} /></mesh>
          <mesh position={[0, -0.42, 0.08]} castShadow receiveShadow material={floor("limestone", "#d9d4c8", 1, 1)}><boxGeometry args={[0.9, 0.03, 0.22]} /></mesh>
          <group position={[0, -0.405, 0.08]}><AccessoryObject kind={first.kind} color={first.color} /></group>
        </Pickable>
      );
  }
}

/** One fixture with the catalog products assigned to it. Hover and click always resolve to a single catalog product id. */
export function ProductDisplay({ display }: { display: ResolvedDisplay }) {
  const { slot, products } = display;
  const selectedId = useCameraStore(selectFocusedProductId);
  const mine = selectedId && products.some((p) => p.id === selectedId) ? selectedId : null;
  const [hoverId, setHoverId] = useState<string | null>(null);
  const spinRef = useRef<Group>(null);
  const hoverRef = useRef<Group>(null);
  const reduced = useReducedMotion();
  const hovered = products.find((p) => p.id === hoverId);

  useFrame((_, dt) => {
    if (slot.spin && !reduced && spinRef.current) spinRef.current.rotation.y += dt * 0.35;
    const g = hoverRef.current;
    if (g) { const target = hoverId && !mine ? 1.04 : 1; const k = reduced ? 1 : 1 - Math.exp(-dt * 12); g.scale.setScalar(g.scale.x + (target - g.scale.x) * k); }
  });
  const handlers: Handlers = {
    hover: (id) => {
      setHoverId(id);
      useCameraStore.setState({ hoverProductId: id });
      document.body.style.cursor = id ? "pointer" : "";
    },
    pick: (id) => cameraManager.focusProduct(id),
  };

  const first = products[0]!;
  // A product with its own 3D model is shown on a stand; the model is only used when it is that exact product's asset.
  const model = products.length === 1 && first.modelUrl && slot.type !== "niche" ? first : null;
  const body = model ? (
    <Pickable pid={model.id} h={handlers}>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow material={floor("limestone", "#e2ddd1", 2, 2)}><cylinderGeometry args={[0.9, 0.95, 0.3, 40]} /></mesh>
      <group position={[0, 0.3, 0]}><ModelOrFallback url={model.modelUrl!} height={1.5} fallback={<ProductItem p={model} zone={slot.departmentId} />} /></group>
    </Pickable>
  ) : <Body display={display} h={handlers} />;

  return (
    <group position={[...slot.position]} rotation={[...slot.rotation]} scale={slot.scale}>
      <group ref={hoverRef}><group ref={spinRef}>{body}</group></group>
      {hovered && !mine && (
        <Html position={[0, slot.type === "niche" ? 1 : 2.5, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-sm bg-ink px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-paper shadow-pop">
            {hovered.brandName} · {hovered.name}{hovered.demo ? " · demo" : ""}
          </div>
        </Html>
      )}
      {(hoverId || mine) && slot.type !== "niche" && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.25, 1.29, 64]} />
          <meshBasicMaterial color={mine ? "#f3e9d2" : "#ffffff"} transparent opacity={mine ? 0.95 : 0.6} />
        </mesh>
      )}
    </group>
  );
}
