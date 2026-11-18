"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { OrbitControls as OrbitImpl } from "three-stdlib";

export type LightPreset = "studio" | "daylight" | "warm" | "dramatic";
export type InspectMode = "shaded" | "texture" | "normals" | "wireframe";
export type ViewName = "front" | "back" | "left" | "right" | "top";
export type ViewerApi = { view: (v: ViewName) => void; reset: () => void; zoom: (factor: number) => void; rotate: (dAzimuth: number, dPolar: number) => void };

export const PRESETS: Record<LightPreset, { label: string; bg: string; env: number; key: number; rim: number; color: string }> = {
  studio: { label: "Studio", bg: "#eceae5", env: 0.9, key: 1.6, rim: 0.6, color: "#ffffff" },
  daylight: { label: "Daylight", bg: "#dde5ea", env: 1.3, key: 2.4, rim: 0.4, color: "#fff6e5" },
  warm: { label: "Warm", bg: "#eee2d2", env: 0.7, key: 1.8, rim: 0.8, color: "#ffd9a8" },
  dramatic: { label: "Dramatic", bg: "#131313", env: 0.18, key: 3.2, rim: 2.4, color: "#ffffff" },
};

const FIT = 1.8; // model is scaled so its largest dimension is this many world units

/** Centres and scales the model once, and returns the radius the camera should orbit at. */
function useFitted(root: THREE.Object3D) {
  return useMemo(() => {
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const s = FIT / Math.max(size.x, size.y, size.z, 1e-6);
    const center = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    root.position.sub(center);
    holder.add(root);
    holder.scale.setScalar(s);
    return { holder, radius: (Math.max(size.x, size.y, size.z) * s) / 2 };
  }, [root]);
}

type SavedMat = { material: THREE.Material | THREE.Material[] };
const saved = new WeakMap<THREE.Mesh, SavedMat>();

/** Swaps materials for inspection (flat texture, normals, wireframe) and restores the originals. */
export function applyInspect(root: THREE.Object3D, mode: InspectMode) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (!saved.has(m)) saved.set(m, { material: m.material });
    const orig = saved.get(m)!.material;
    const prev = m.material;
    const origList = Array.isArray(orig) ? orig : [orig];
    const next = mode === "normals" ? new THREE.MeshNormalMaterial()
      : mode === "texture" ? origList.map((x) => { const s = x as THREE.MeshStandardMaterial; return new THREE.MeshBasicMaterial({ map: s.map ?? null, color: s.map ? 0xffffff : s.color ?? 0xffffff, side: s.side }); })
      : origList.map((x) => { if ("wireframe" in x) (x as THREE.MeshStandardMaterial).wireframe = mode === "wireframe"; return x; });
    const nextMat = Array.isArray(next) ? (next.length === 1 ? next[0]! : next) : next;
    // Only dispose materials WE created for inspection, never the model's own.
    for (const x of Array.isArray(prev) ? prev : [prev]) if (!origList.includes(x)) x.dispose();
    m.material = nextMat;
  });
}

function Scene({ root, preset, inspect, autoRotate, apiRef, reduced }: { root: THREE.Object3D; preset: LightPreset; inspect: InspectMode; autoRotate: boolean; apiRef: React.RefObject<ViewerApi | null>; reduced: boolean }) {
  const { holder, radius } = useFitted(root);
  const { camera, gl, scene } = useThree();
  const controls = useRef<OrbitImpl>(null);
  const home = useMemo(() => new THREE.Vector3(0.0, radius * 0.3, radius * 5.4), [radius]);
  const anim = useRef<{ from: THREE.Vector3; to: THREE.Vector3; t: number } | null>(null);
  const cfg = PRESETS[preset];

  // Environment map made on the GPU from a procedural room: no network request, no HDR file.
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const rt = pm.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = rt.texture;
    return () => { scene.environment = null; rt.dispose(); pm.dispose(); };
  }, [gl, scene]);
  useEffect(() => { scene.environmentIntensity = cfg.env; scene.background = new THREE.Color(cfg.bg); }, [scene, cfg]);
  useEffect(() => { applyInspect(root, inspect); }, [root, inspect]);
  useEffect(() => { camera.position.copy(home); camera.near = radius / 50; camera.far = radius * 40; camera.updateProjectionMatrix(); }, [camera, home, radius]);

  const goTo = (to: THREE.Vector3) => {
    if (reduced) { camera.position.copy(to); controls.current?.update(); return; }
    anim.current = { from: camera.position.clone(), to, t: 0 };
  };
  useEffect(() => {
    const dist = () => camera.position.distanceTo(controls.current?.target ?? new THREE.Vector3());
    apiRef.current = {
      view: (v) => { const d = home.length(); const p = { front: [0, 0.07, 1], back: [0, 0.07, -1], left: [-1, 0.07, 0], right: [1, 0.07, 0], top: [0, 1, 0.001] }[v]; goTo(new THREE.Vector3(...(p as [number, number, number])).normalize().multiplyScalar(d)); },
      reset: () => { controls.current?.target.set(0, 0, 0); goTo(home.clone()); },
      zoom: (f) => { const d = Math.min(radius * 12, Math.max(radius * 0.35, dist() * f)); goTo(camera.position.clone().sub(controls.current?.target ?? new THREE.Vector3()).setLength(d).add(controls.current?.target ?? new THREE.Vector3())); },
      rotate: (a, p) => { const c = controls.current; if (!c) return; const off = camera.position.clone().sub(c.target); const sph = new THREE.Spherical().setFromVector3(off); sph.theta += a; sph.phi = Math.min(Math.PI - 0.05, Math.max(0.05, sph.phi + p)); camera.position.copy(c.target).add(new THREE.Vector3().setFromSpherical(sph)); c.update(); },
    };
    return () => { apiRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home, radius, reduced]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (a) { a.t = Math.min(1, a.t + dt / 0.6); const e = 1 - Math.pow(1 - a.t, 3); camera.position.lerpVectors(a.from, a.to, e); if (a.t >= 1) anim.current = null; }
    controls.current?.update();
  });

  return (
    <>
      <primitive object={holder} />
      <directionalLight position={[2.5, 4, 3]} intensity={cfg.key} color={cfg.color} />
      <directionalLight position={[-3, 2, -3]} intensity={cfg.rim} color={cfg.color} />
      <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} enablePan screenSpacePanning
        minDistance={radius * 0.35} maxDistance={radius * 12} autoRotate={autoRotate && !reduced} autoRotateSpeed={1.4}
        onStart={() => { anim.current = null; }} />
    </>
  );
}

/** The WebGL canvas for the product viewer. Rendering stops when `active` is false (scrolled away or tab hidden). */
export default function ViewerCanvas(props: { root: THREE.Object3D; preset: LightPreset; inspect: InspectMode; autoRotate: boolean; apiRef: React.RefObject<ViewerApi | null>; active: boolean; reduced: boolean }) {
  const { active, ...rest } = props;
  return (
    <Canvas frameloop={active ? "always" : "never"} dpr={[1, 2]} camera={{ fov: 32 }} gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.domElement.setAttribute("aria-hidden", "true"); }}>
      <Scene {...rest} />
    </Canvas>
  );
}
