"use client";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { ResolvedDisplay } from "@/modules/showroom/types";
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Effects } from "./scene/Effects";
import { disposeMaterials } from "./scene/pbr/materials";
import { disposeGeometry } from "./scene/pbr/geometry";
import { useQuality } from "@/stores/quality-store";
import { CameraDirector } from "./scene/CameraDirector";
import { ShowroomEnvironment } from "./scene/ShowroomEnvironment";

/** Diagnostics only: add ?stats=1 to the URL to expose renderer counters as window.__vestoraStats. */
function Stats() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (!window.location.search.includes("stats")) return;
    const id = setInterval(() => {
      const i = gl.info;
      (window as unknown as { __vestoraStats: unknown }).__vestoraStats = { drawCalls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs?.length ?? 0 };
    }, 500);
    return () => clearInterval(id);
  }, [gl]);
  return null;
}

export default function ShowroomScene({ displays }: { displays: readonly ResolvedDisplay[] }) {
  const level = useQuality((s) => s.level);
  // Release cached textures, materials and geometry when the scene is torn down.
  useEffect(() => () => { disposeMaterials(); disposeGeometry(); }, []);
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} dpr={level === "high" ? [1, 1.75] : [1, 1.25]}
      camera={{ fov: 30, near: 1, far: 700, position: [60, 60, 80] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      aria-label="Interactive 3D fashion mall"
    >
      <color attach="background" args={["#d7d4ce"]} />
      <fog attach="fog" args={["#d7d4ce", 190, 520]} />
      <PerformanceMonitor onDecline={() => { if (!useQuality.getState().manual) useQuality.getState().set("lite"); }} />
      <Suspense fallback={null}>
        <ShowroomEnvironment displays={displays} />
      </Suspense>
      <CameraDirector displays={displays} />
      <Effects />
      <Stats />
    </Canvas>
  );
}
