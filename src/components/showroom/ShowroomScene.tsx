"use client";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { ResolvedDisplay } from "@/modules/showroom/types";
import { useMemo } from "react";
import { CameraDirector } from "./scene/CameraDirector";
import { ShowroomEnvironment } from "./scene/ShowroomEnvironment";

export default function ShowroomScene({ displays }: { displays: readonly ResolvedDisplay[] }) {
  const placements = useMemo(() => displays.map((d) => d.placement), [displays]);
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }} dpr={[1, 1.75]}
      camera={{ fov: 30, near: 1, far: 700, position: [60, 60, 80] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      aria-label="Interactive 3D fashion mall"
    >
      <color attach="background" args={["#e9e6df"]} />
      <fog attach="fog" args={["#e9e6df", 160, 420]} />
      <Suspense fallback={null}>
        <ShowroomEnvironment displays={displays} />
      </Suspense>
      <CameraDirector placements={placements} />
    </Canvas>
  );
}
