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

function sceneCounts(scene: THREE.Object3D) {
  let meshes = 0, instanced = 0, merged = 0, casters = 0, lights = 0, transparent = 0, skinned = 0; const byMat = new Map<string, number>();
  scene.traverseVisible((o) => {
    const m = o as THREE.Mesh;
    if ((o as THREE.Light).isLight) lights++;
    if (!m.isMesh) return;
    meshes++; if ((m as THREE.InstancedMesh).isInstancedMesh) instanced++; if (m.userData.merged) merged++; if (m.castShadow) casters++;
    const mat = Array.isArray(m.material) ? m.material[0] : m.material; if (mat?.transparent) transparent++; if ((m as THREE.SkinnedMesh).isSkinnedMesh) skinned++;
    const k = mat?.type ?? "?"; byMat.set(k, (byMat.get(k) ?? 0) + 1);
  });
  return { meshes, instanced, merged, casters, lights, transparent, skinned, byMaterial: Object.fromEntries(byMat) };
}

/** Diagnostics only: add ?stats=1 to the URL to expose renderer counters as window.__vestoraStats. */
function Stats() {
  const gl = useThree((s) => s.gl), scene = useThree((s) => s.scene);
  useEffect(() => {
    if (!window.location.search.includes("stats")) return;
    const id = setInterval(() => {
      const i = gl.info;
      (window as unknown as { __vestoraStats: unknown }).__vestoraStats = { drawCalls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs?.length ?? 0, scene: sceneCounts(scene) };
    }, 500);
    return () => clearInterval(id);
  }, [gl]);
  return null;
}

/** Stop rendering while the scene is scrolled out of view or the tab is in the background; resume instantly when it is back. */
function PauseWhenHidden() {
  const gl = useThree((s) => s.gl), setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    let onScreen = true, tabVisible = !document.hidden;
    const apply = () => setFrameloop(onScreen && tabVisible ? "always" : "never");
    const io = new IntersectionObserver(([e]) => { onScreen = !!e?.isIntersecting; apply(); }, { rootMargin: "80px" });
    io.observe(gl.domElement);
    const vis = () => { tabVisible = !document.hidden; apply(); };
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); setFrameloop("always"); };
  }, [gl, setFrameloop]);
  return null;
}

export default function ShowroomScene({ displays }: { displays: readonly ResolvedDisplay[] }) {
  const level = useQuality((s) => s.level);
  // Release cached textures, materials and geometry when the scene is torn down.
  useEffect(() => () => { disposeMaterials(); disposeGeometry(); }, []);
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} dpr={level === "high" ? [1, 1.5] : [1, 1]}
      camera={{ fov: 30, near: 1, far: 700, position: [60, 60, 80] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      aria-label="Interactive 3D fashion mall"
    >
      <color attach="background" args={["#d7d4ce"]} />
      <fog attach="fog" args={["#d7d4ce", 190, 520]} />
      <PerformanceMonitor ms={150} iterations={6} threshold={0.7} onDecline={() => { if (!useQuality.getState().manual) useQuality.getState().set("lite"); }} />
      <PauseWhenHidden />
      <Suspense fallback={null}>
        <ShowroomEnvironment displays={displays} />
      </Suspense>
      <CameraDirector displays={displays} />
      <Effects />
      <Stats />
    </Canvas>
  );
}
