"use client";
import { useMemo } from "react";
import { signTexture, type SignStyle } from "./signTexture";
import { brass, blackSteel } from "./pbr/materials";

type Props = {
  title: string; subtitle?: string; style: SignStyle; accent: string;
  width?: number; height?: number; position?: readonly [number, number, number]; rotationY?: number;
};

/** Wall sign: dark powder-coated plate, engraved lettering, brass edge. Lit by the room, not self-glowing. */
export function DepartmentSign({ title, subtitle = "", style, width = 6, height = 1.4, position = [0, 0, 0], rotationY = 0 }: Props) {
  const tex = useMemo(() => signTexture(title, subtitle, style, 1024, Math.round((1024 * height) / width)), [title, subtitle, style, width, height]);
  return (
    <group position={[...position]} rotation={[0, rotationY, 0]}>
      <mesh castShadow receiveShadow material={blackSteel()}><boxGeometry args={[width + 0.12, height + 0.12, 0.08]} /></mesh>
      <mesh position={[0, 0, 0.042]}><planeGeometry args={[width, height]} /><meshStandardMaterial map={tex} roughness={0.55} metalness={0.1} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.12} /></mesh>
      <mesh position={[0, -(height / 2 + 0.075), 0.01]} castShadow material={brass()}><boxGeometry args={[width + 0.12, 0.018, 0.09]} /></mesh>
    </group>
  );
}
