"use client";
import { CORRIDORS, ZONES, getZone } from "@/modules/showroom/layout";
import type { ResolvedDisplay } from "@/modules/showroom/types";
import { Corridor } from "./Corridor";
import { DepartmentZone } from "./DepartmentZone";
import { LightingSystem } from "./LightingSystem";
import { MainEntrance } from "./MainEntrance";
import { ProductDisplay } from "./ProductDisplay";
import { floor, paint } from "./pbr/materials";
import { cameraManager } from "@/modules/showroom/camera/manager";
import { ZoneHighlight } from "./ZoneHighlight";
import { StaticMerge } from "./StaticMerge";
import { ShadowThrottle } from "./ShadowThrottle";
import type { ThreeEvent } from "@react-three/fiber";

const stop = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.stopPropagation();

/** The whole mall: base slab, zones, corridors, entrance portal, lighting and every product display. */
export function ShowroomEnvironment({ displays }: { displays: readonly ResolvedDisplay[] }) {
  const entrance = getZone("entrance");
  return (
    <group>
      <LightingSystem />
      {/* site plinth: pale stone apron around the building, dark plinth edge, then the studio ground */}
      <mesh position={[0, -0.37, 16]} receiveShadow material={floor("concrete", "#aaa69e", 68, 104)}><boxGeometry args={[68, 0.5, 104]} /></mesh>
      <mesh position={[0, -0.72, 16]} material={paint("#232325", 0.6)}><boxGeometry args={[69, 0.2, 105]} /></mesh>
      <mesh position={[0, -0.9, 16]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={paint("#c8c5be", 1)}><planeGeometry args={[600, 600]} /></mesh>
      {/* Architecture absorbs pointer events so displays hidden behind a wall cannot be hovered or clicked through it. */}
      <StaticMerge onPointerOver={stop} onPointerMove={stop} onClick={stop}>
        {ZONES.map((z) => <DepartmentZone key={z.id} zone={z} />)}
        {CORRIDORS.map((c) => <Corridor key={c.id} def={c} />)}
        <MainEntrance position={[entrance.center[0], 0, entrance.center[1]]} />
      </StaticMerge>
      <ShadowThrottle />
      <ZoneHighlight />
      {displays.map((d) => <ProductDisplay key={d.slot.id} display={d} />)}
    </group>
  );
}
