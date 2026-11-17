"use client";
import type { ZoneDef } from "@/modules/showroom/types";
import { ZONE_SIZE, WALL_HEIGHT, openingsFor } from "@/modules/showroom/layout";
import { DepartmentSign } from "./DepartmentSign";
import { ExhibitionWall, type WallVariant } from "./ExhibitionWall";
import { ZoneDecor } from "./Decor";
import { Walls } from "./Walls";
import { floor, paint } from "./pbr/materials";

const WALL_FOR: Record<string, WallVariant | null> = {
  luxury: "marble", streetwear: "graphic", minimal: "slats", casual: "slats", formal: "panels",
  accessories: "panels", "new-arrivals": "accent", entrance: null, lounge: null,
};

/** One department area: floor slab with a polished or textured finish, walls with doorways, feature wall, sign and decor. */
export function DepartmentZone({ zone }: { zone: ZoneDef }) {
  const { palette } = zone;
  const open = openingsFor(zone);
  const variant = WALL_FOR[zone.id] ?? null;
  const signInk = ["#2e2e2f", "#1c1c1d"].includes(palette.accent) ? "#e9e4d8" : palette.accent;
  // The feature wall is split around a doorway on the north side.
  const segments = open.n ? [{ x: -5.2, w: 5.4 }, { x: 5.2, w: 5.4 }] : [{ x: 0, w: 14 }];
  const showSneakerWall = zone.id === "streetwear";
  return (
    <group position={[zone.center[0], 0, zone.center[1]]}>
      {/* structural slab (its edge is visible on the cutaway side) and the finished floor on top */}
      <mesh position={[0, -0.12, 0]} receiveShadow material={paint("#b9b5ac", 0.9)}><boxGeometry args={[ZONE_SIZE, 0.24, ZONE_SIZE]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow material={floor(palette.floorKind, palette.floor, ZONE_SIZE, ZONE_SIZE)}>
        <planeGeometry args={[ZONE_SIZE, ZONE_SIZE]} />
      </mesh>
      <Walls palette={palette} open={open} />
      {variant && segments.map((s) => (
        <group key={s.x} position={[s.x, 0, -7.6]}>
          <ExhibitionWall variant={variant} width={s.w} height={3.4} palette={palette} />
        </group>
      ))}
      {showSneakerWall && (
        <>
          <group position={[-7.6, 0, open.w ? -4.9 : 0]} rotation={[0, Math.PI / 2, 0]}><ExhibitionWall variant="grid" width={open.w ? 5 : 14} height={3.4} palette={palette} /></group>
          {open.w && <group position={[-7.6, 0, 4.9]} rotation={[0, Math.PI / 2, 0]}><ExhibitionWall variant="grid" width={5} height={3.4} palette={palette} /></group>}
        </>
      )}
      <DepartmentSign
        title={zone.name} subtitle={zone.tagline}
        style={{ bg: "#161618", fg: signInk, sub: "#a9a499" }} accent={signInk}
        position={[0, WALL_HEIGHT - 1.15, -7.55]} width={5.2} height={1.1}
      />
      <ZoneDecor id={zone.id} palette={palette} />
    </group>
  );
}
