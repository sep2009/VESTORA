"use client";
import { CORRIDORS, ZONES, getZone } from "@/modules/showroom/layout";
import type { ResolvedDisplay } from "@/modules/showroom/types";
import { Corridor } from "./Corridor";
import { DepartmentZone } from "./DepartmentZone";
import { LightingSystem } from "./LightingSystem";
import { MainEntrance } from "./MainEntrance";
import { ProductDisplay } from "./ProductDisplay";
import { cameraManager } from "@/modules/showroom/camera/manager";
import { ZoneHighlight } from "./ZoneHighlight";
import type { ThreeEvent } from "@react-three/fiber";

const stop = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.stopPropagation();

/** The whole mall: base slab, zones, corridors, entrance portal, lighting and every product display. */
export function ShowroomEnvironment({ displays }: { displays: readonly ResolvedDisplay[] }) {
  const entrance = getZone("entrance");
  return (
    <group>
      <LightingSystem />
      <mesh position={[0, -0.35, 4]} receiveShadow><boxGeometry args={[68, 0.6, 80]} /><meshStandardMaterial color="#c9c5bb" roughness={0.9} /></mesh>
      <mesh position={[0, -0.75, 4]}><boxGeometry args={[69, 0.3, 81]} /><meshStandardMaterial color="#2a2a2e" roughness={0.7} /></mesh>
      {/* Architecture absorbs pointer events so displays hidden behind a wall cannot be hovered or clicked through it. */}
      <group onPointerOver={stop} onPointerMove={stop} onClick={stop}>
        {ZONES.map((z) => <DepartmentZone key={z.id} zone={z} />)}
        {CORRIDORS.map((c) => <Corridor key={c.id} def={c} />)}
        <MainEntrance position={[entrance.center[0], 0, entrance.center[1]]} />
      </group>
      <ZoneHighlight />
      {displays.map((d) => <ProductDisplay key={d.placement.id} display={d} />)}
    </group>
  );
}
