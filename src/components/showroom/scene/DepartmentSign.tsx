"use client";
import { useMemo } from "react";
import { signTexture, type SignStyle } from "./materials";

type Props = {
  title: string; subtitle?: string; style: SignStyle; accent: string;
  width?: number; height?: number; position?: readonly [number, number, number]; rotationY?: number;
};

/** Wall-mounted sign. Text is baked to a texture (no font downloads). */
export function DepartmentSign({ title, subtitle = "", style, accent, width = 6, height = 1.4, position = [0, 0, 0], rotationY = 0 }: Props) {
  const tex = useMemo(() => signTexture(title, subtitle, style, 1024, Math.round((1024 * height) / width)), [title, subtitle, style, width, height]);
  return (
    <group position={[...position]} rotation={[0, rotationY, 0]}>
      <mesh castShadow><boxGeometry args={[width + 0.2, height + 0.2, 0.12]} /><meshStandardMaterial color="#111114" roughness={0.5} /></mesh>
      <mesh position={[0, 0, 0.065]}><planeGeometry args={[width, height]} /><meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.35} roughness={0.7} /></mesh>
      <mesh position={[0, -(height / 2 + 0.1), 0.02]}><boxGeometry args={[width + 0.2, 0.06, 0.14]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} /></mesh>
    </group>
  );
}
