"use client";
import { useMemo } from "react";
import { floorTexture } from "./materials";
import type { ZoneDef } from "@/modules/showroom/types";
import { ZONE_SIZE, WALL_HEIGHT, openingsFor } from "@/modules/showroom/layout";
import { DepartmentSign } from "./DepartmentSign";
import { ExhibitionWall, type WallVariant } from "./ExhibitionWall";
import { ZoneDecor } from "./Decor";
import { Walls } from "./Walls";

const WALL_FOR: Record<string, WallVariant | null> = {
  luxury: "marble", streetwear: "graphic", minimal: "slats", casual: "slats", formal: "panels",
  accessories: "panels", "new-arrivals": "accent", entrance: null, lounge: null,
};

/** One department area: floor, walls with doorways, feature wall, sign and decor. Product displays are rendered by the environment. */
export function DepartmentZone({ zone }: { zone: ZoneDef }) {
  const { palette } = zone;
  const open = openingsFor(zone);
  const floor = useMemo(() => floorTexture(palette.floorKind, palette.floor, palette.floorLine, [4, 4]), [palette]);
  const variant = WALL_FOR[zone.id] ?? null;
  const signInk = ["#2b2b2b", "#121212"].includes(palette.accent) ? "#f5f3ef" : palette.accent;

  // The feature wall is split around a doorway on the north side.
  const segments = open.n ? [{ x: -5.2, w: 5.4 }, { x: 5.2, w: 5.4 }] : [{ x: 0, w: 14 }];
  const showSneakerWall = zone.id === "streetwear";
  return (
    <group position={[zone.center[0], 0, zone.center[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[ZONE_SIZE, ZONE_SIZE]} /><meshStandardMaterial map={floor} roughness={0.55} />
      </mesh>
      <Walls palette={palette} open={open} />
      {variant && segments.map((s) => (
        <group key={s.x} position={[s.x, 0, -7.6]}>
          <ExhibitionWall variant={variant} width={s.w} height={3.4} palette={palette} />
        </group>
      ))}
      {showSneakerWall && (
        <group position={[-7.6, 0, open.w ? -4.9 : 0]} rotation={[0, Math.PI / 2, 0]}>
          <ExhibitionWall variant="grid" width={open.w ? 5 : 14} height={3.4} palette={palette} />
        </group>
      )}
      {showSneakerWall && open.w && (
        <group position={[-7.6, 0, 4.9]} rotation={[0, Math.PI / 2, 0]}>
          <ExhibitionWall variant="grid" width={5} height={3.4} palette={palette} />
        </group>
      )}
      <DepartmentSign
        title={zone.name} subtitle={zone.tagline}
        style={{ bg: "#111114", fg: signInk, sub: "#d9d5cc" }} accent={signInk}
        position={[0, WALL_HEIGHT - 1.05, -7.5]} width={6} height={1.3}
      />
      <ZoneDecor id={zone.id} palette={palette} />
    </group>
  );
}
