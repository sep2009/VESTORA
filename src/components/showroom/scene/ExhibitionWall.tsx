"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { ZonePalette } from "@/modules/showroom/types";
import { blackSteel, brass, fabric, floor, paint, wall, wood } from "./pbr/materials";

export type WallVariant = "marble" | "slats" | "graphic" | "panels" | "accent";

function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

/**
 * Feature wall. Local origin = centre of the base, backing at z=0, content faces +z.
 * Pure architecture/decoration; the "grid" variant shows decorative sneakers, which are not products.
 */
export function ExhibitionWall({ variant, width, height, palette }: { variant: WallVariant; width: number; height: number; palette: ZonePalette }) {
  const r = useMemo(() => rng(Math.round(width * 13 + height * 7) + variant.length), [width, height, variant]);
  const backing = (
    <mesh position={[0, height / 2, 0.05]} receiveShadow castShadow material={variant === "graphic" ? paint("#171719", 0.7) : wall(palette.wall, width, height)}>
      <boxGeometry args={[width, height, 0.1]} />
    </mesh>
  );
  let content: React.ReactNode = null;

  if (variant === "marble") {
    const n = Math.max(2, Math.floor(width / 2.6)), w = width / n;
    content = Array.from({ length: n }, (_, i) => (
      <group key={i} position={[-width / 2 + w * (i + 0.5), height / 2, 0.12]}>
        <mesh castShadow receiveShadow material={floor("marble", "#d5cfc2", w - 0.16, height - 0.2)}><boxGeometry args={[w - 0.16, height - 0.2, 0.05]} /></mesh>
        <mesh position={[0, 0, 0.03]} material={brass()}><boxGeometry args={[0.012, height - 0.2, 0.012]} /></mesh>
      </group>
    ));
    content = <>{content}<mesh position={[0, 0.1, 0.1]} castShadow material={brass()}><boxGeometry args={[width, 0.05, 0.04]} /></mesh></>;
  } else if (variant === "slats") {
    const pitch = 0.18, n = Math.floor(width / pitch);
    content = (
      <>
        <mesh position={[0, height / 2, 0.11]} material={paint("#2a2420", 0.9)}><boxGeometry args={[width - 0.1, height - 0.1, 0.02]} /></mesh>
        {Array.from({ length: n }, (_, i) => (
          <mesh key={i} position={[-width / 2 + pitch / 2 + i * pitch, height / 2, 0.17]} castShadow receiveShadow material={wood("slat", "#b8956b", 0.12, height)}>
            <boxGeometry args={[0.11, height - 0.2, 0.08]} />
          </mesh>
        ))}
      </>
    );
  } else if (variant === "graphic") {
    const cols = ["#2b2b2e", "#e6e1d6", "#9b3b32", "#5f6f7d", "#c8cd72"];
    content = Array.from({ length: 6 }, (_, i) => {
      const w = 1.0 + r() * 1.2, h = 1.2 + r() * 1.3;
      return (
        <group key={i} position={[-width / 2 + w / 2 + 0.2 + (i / 6) * (width - w - 0.4), 0.9 + h / 2 + r() * (height - h - 1.4), 0.12]}>
          <mesh castShadow material={blackSteel()}><boxGeometry args={[w + 0.06, h + 0.06, 0.04]} /></mesh>
          <mesh position={[0, 0, 0.022]} material={paint(cols[i % cols.length]!, 0.8)}><planeGeometry args={[w, h]} /></mesh>
          <mesh position={[(r() - 0.5) * w * 0.3, (r() - 0.5) * h * 0.3, 0.024]} material={paint(cols[(i + 2) % cols.length]!, 0.8)}><planeGeometry args={[w * 0.5, h * 0.35]} /></mesh>
        </group>
      );
    });
  } else if (variant === "panels") {
    const n = Math.max(2, Math.floor(width / 1.8)), w = width / n;
    content = (
      <>
        {Array.from({ length: n }, (_, i) => (
          <RoundedBox key={i} args={[w - 0.1, height * 0.74, 0.07]} radius={0.02} smoothness={2} position={[-width / 2 + w * (i + 0.5), height * 0.45, 0.13]} castShadow receiveShadow material={fabric(`#${new THREE.Color(palette.wall).multiplyScalar(1.3).getHexString()}`)} />
        ))}
        <mesh position={[0, 0.2, 0.1]} castShadow material={brass()}><boxGeometry args={[width, 0.06, 0.05]} /></mesh>
        <mesh position={[0, height * 0.85, 0.1]} material={brass()}><boxGeometry args={[width, 0.02, 0.03]} /></mesh>
      </>
    );
  } else if (variant === "accent") {
    content = (
      <group position={[0, height / 2, 0.11]}>
        <mesh castShadow receiveShadow material={floor("limestone", "#e0d9cb", width, height)}><boxGeometry args={[width - 0.3, height - 0.3, 0.05]} /></mesh>
        {[-1, 1].map((k) => <mesh key={k} position={[0, k * (height / 2 - 0.35), 0.03]} material={brass()}><boxGeometry args={[width - 0.5, 0.02, 0.012]} /></mesh>)}
        <mesh position={[0, 0, 0.03]} material={paint(palette.accent, 0.75)}><boxGeometry args={[0.7, height * 0.5, 0.012]} /></mesh>
      </group>
    );
  }
  return <group>{backing}{content}</group>;
}
