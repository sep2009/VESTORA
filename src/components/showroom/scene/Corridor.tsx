"use client";
import { CORRIDOR_LENGTH, CORRIDOR_WIDTH, CUTAWAY_HEIGHT, WALL_HEIGHT, WALL_THICKNESS, type CorridorDef } from "@/modules/showroom/layout";
import { DirectionalSign } from "./DirectionalSign";
import { floor, lightStrip, paint, wall } from "./pbr/materials";

/**
 * Passage between two zones. Built along local X with the tall wall on local north (-z) and the
 * low cutaway wall on local south; N-S corridors are the same geometry rotated a quarter turn.
 */
export function Corridor({ def }: { def: CorridorDef }) {
  const rot = def.axis === "z" ? Math.PI / 2 : 0;
  const half = CORRIDOR_WIDTH / 2;
  const left = def.axis === "x" ? def.a.name : def.b.name;
  const right = def.axis === "x" ? def.b.name : def.a.name;
  const w = wall("#e4e0d7", CORRIDOR_LENGTH, WALL_HEIGHT);
  return (
    <group position={[def.center[0], 0, def.center[1]]} rotation={[0, rot, 0]}>
      <mesh position={[0, -0.12, 0]} receiveShadow material={paint("#b9b5ac", 0.9)}><boxGeometry args={[CORRIDOR_LENGTH, 0.24, CORRIDOR_WIDTH]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow material={floor("limestone", "#d4d0c6", CORRIDOR_LENGTH, CORRIDOR_WIDTH)}><planeGeometry args={[CORRIDOR_LENGTH, CORRIDOR_WIDTH]} /></mesh>
      <mesh position={[0, WALL_HEIGHT / 2, -(half + WALL_THICKNESS / 2)]} castShadow receiveShadow material={w}><boxGeometry args={[CORRIDOR_LENGTH, WALL_HEIGHT, WALL_THICKNESS]} /></mesh>
      <mesh position={[0, CUTAWAY_HEIGHT / 2, half + WALL_THICKNESS / 2]} castShadow receiveShadow material={w}><boxGeometry args={[CORRIDOR_LENGTH, CUTAWAY_HEIGHT, WALL_THICKNESS]} /></mesh>
      <mesh position={[0, CUTAWAY_HEIGHT + 0.02, half + WALL_THICKNESS / 2]} castShadow receiveShadow material={floor("limestone", "#d6d1c6", 1, 1)}><boxGeometry args={[CORRIDOR_LENGTH, 0.04, WALL_THICKNESS + 0.06]} /></mesh>
      <mesh position={[0, WALL_HEIGHT - 0.215, -(half - 0.04)]} material={lightStrip("#fff0d6", 1.0)}><boxGeometry args={[CORRIDOR_LENGTH, 0.02, 0.07]} /></mesh>
      <mesh position={[0, 0.07, -(half - 0.012)]} castShadow material={paint("#2a2a2c", 0.5)}><boxGeometry args={[CORRIDOR_LENGTH, 0.14, 0.024]} /></mesh>
      <DirectionalSign left={left} right={right} position={[0, 3.3, -(half - 0.06)]} />
    </group>
  );
}
