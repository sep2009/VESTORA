"use client";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { ZonePalette } from "@/modules/showroom/types";
import { sneakerGeometry } from "./pbr/geometry";
import { blackSteel, brass, fabric, floor, leather, lightStrip, paint, rubber, wall, wood } from "./pbr/materials";

export type WallVariant = "marble" | "slats" | "graphic" | "panels" | "grid" | "accent";

function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

/** Decorative sneakers on the cubby wall: two instanced draw calls for the whole wall. Not products. */
function SneakerField({ cells }: { cells: { x: number; y: number; c: THREE.Color }[] }) {
  const { upper, sole } = sneakerGeometry();
  const u = useRef<THREE.InstancedMesh>(null), s = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    cells.forEach((c, i) => {
      m.compose(new THREE.Vector3(c.x, c.y, 0), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      u.current!.setMatrixAt(i, m); s.current!.setMatrixAt(i, m); u.current!.setColorAt(i, c.c);
    });
    for (const r of [u.current!, s.current!]) r.instanceMatrix.needsUpdate = true;
    u.current!.instanceColor!.needsUpdate = true;
  }, [cells]);
  return (
    <>
      <instancedMesh ref={u} args={[upper, leather("#ffffff"), cells.length]} castShadow />
      <instancedMesh ref={s} args={[sole, rubber("#ece9e2"), cells.length]} castShadow />
    </>
  );
}

/**
 * Feature wall. Local origin = centre of the base, backing at z=0, content faces +z.
 * Pure architecture/decoration; the "grid" variant shows decorative sneakers, which are not products.
 */
export function ExhibitionWall({ variant, width, height, palette }: { variant: WallVariant; width: number; height: number; palette: ZonePalette }) {
  const r = useMemo(() => rng(Math.round(width * 13 + height * 7) + variant.length), [width, height, variant]);
  const backing = (
    <mesh position={[0, height / 2, 0.05]} receiveShadow castShadow material={variant === "graphic" || variant === "grid" ? paint("#171719", 0.7) : wall(palette.wall, width, height)}>
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
          <RoundedBox key={i} args={[w - 0.1, height * 0.74, 0.07]} radius={0.02} smoothness={2} position={[-width / 2 + w * (i + 0.5), height * 0.45, 0.13]} castShadow receiveShadow material={fabric(palette.wall === "#3b5254" ? "#415f61" : "#2a3350")} />
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
  } else {
    const cols = Math.floor(width / 0.7), rows = Math.floor((height - 0.4) / 0.55), cw = 0.7, rh = 0.55;
    const sc = ["#ece8df", "#b9b4a8", "#2b2b2e", "#8a3f35", "#5f6f7d", "#c8cd72"].map((c) => new THREE.Color(c));
    const cells: { x: number; y: number; c: THREE.Color }[] = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (r() > 0.2) cells.push({ x: -(cols * cw) / 2 + cw / 2 + i * cw, y: 0.2 + j * rh + 0.03, c: sc[(i * 3 + j * 5) % sc.length]! });
    }
    content = (
      <group position={[0, 0.2, 0.16]}>
        {Array.from({ length: rows + 1 }, (_, j) => <mesh key={`h${j}`} position={[0, j * rh, 0]} castShadow material={blackSteel()}><boxGeometry args={[cols * cw, 0.025, 0.28]} /></mesh>)}
        {Array.from({ length: cols + 1 }, (_, i) => <mesh key={`v${i}`} position={[-(cols * cw) / 2 + i * cw, (rows * rh) / 2, 0]} castShadow material={blackSteel()}><boxGeometry args={[0.025, rows * rh, 0.28]} /></mesh>)}
        <group position={[0, -0.2, 0]}><SneakerField cells={cells} /></group>
        <mesh position={[0, rows * rh + 0.12, 0.0]} material={lightStrip("#fff0d6", 0.8)}><boxGeometry args={[cols * cw, 0.02, 0.2]} /></mesh>
      </group>
    );
  }
  return <group>{backing}{content}</group>;
}
