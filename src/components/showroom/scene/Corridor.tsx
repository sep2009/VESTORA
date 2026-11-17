"use client";
import { useMemo } from "react";
import { floorTexture } from "./materials";
import { CORRIDOR_LENGTH, CORRIDOR_WIDTH, CUTAWAY_HEIGHT, WALL_HEIGHT, WALL_THICKNESS, type CorridorDef } from "@/modules/showroom/layout";
import { DirectionalSign } from "./DirectionalSign";

/**
 * Passage between two zones. Built along local X with the tall wall on local north (-z) and the
 * low cutaway wall on local south; N-S corridors are the same geometry rotated a quarter turn.
 */
export function Corridor({ def }: { def: CorridorDef }) {
  const floor = useMemo(() => floorTexture("plain", "#d9d5cc", "#c4bfb3", [1.5, 1.1]), []);
  const rot = def.axis === "z" ? Math.PI / 2 : 0;
  const half = CORRIDOR_WIDTH / 2;
  // Plate reads left→right in the viewer's frame (see layout notes): for axis x west→east, for axis z south→north.
  const left = def.axis === "x" ? def.a.name : def.b.name;
  const right = def.axis === "x" ? def.b.name : def.a.name;
  return (
    <group position={[def.center[0], 0, def.center[1]]} rotation={[0, rot, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow><planeGeometry args={[CORRIDOR_LENGTH, CORRIDOR_WIDTH]} /><meshStandardMaterial map={floor} roughness={0.6} /></mesh>
      <mesh position={[0, WALL_HEIGHT / 2, -(half + WALL_THICKNESS / 2)]} castShadow receiveShadow><boxGeometry args={[CORRIDOR_LENGTH, WALL_HEIGHT, WALL_THICKNESS]} /><meshStandardMaterial color="#e9e5dc" roughness={0.85} /></mesh>
      <mesh position={[0, CUTAWAY_HEIGHT / 2, half + WALL_THICKNESS / 2]} castShadow receiveShadow><boxGeometry args={[CORRIDOR_LENGTH, CUTAWAY_HEIGHT, WALL_THICKNESS]} /><meshStandardMaterial color="#e9e5dc" roughness={0.85} /></mesh>
      <mesh position={[0, WALL_HEIGHT - 0.25, -(half - 0.06)]}><boxGeometry args={[CORRIDOR_LENGTH, 0.08, 0.12]} /><meshStandardMaterial color="#fff6e4" emissive="#fff6e4" emissiveIntensity={1.4} /></mesh>
      <mesh position={[0, 0.09, -(half - 0.03)]}><boxGeometry args={[CORRIDOR_LENGTH, 0.18, 0.06]} /><meshStandardMaterial color="#8a857a" /></mesh>
      <DirectionalSign left={left} right={right} position={[0, 3.3, -(half - 0.08)]} />
    </group>
  );
}
