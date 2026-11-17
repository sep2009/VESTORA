"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Performance: shadow maps are re-rendered a few times a second instead of every frame.
 * The building is static; only the slow turntables and hover feedback move, so this is visually identical.
 */
export function ShadowThrottle({ hz = 4 }: { hz?: number }) {
  const gl = useThree((s) => s.gl);
  const acc = useRef(0);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => { gl.shadowMap.autoUpdate = true; };
  }, [gl]);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current >= 1 / hz) { acc.current = 0; gl.shadowMap.needsUpdate = true; }
  });
  return null;
}
