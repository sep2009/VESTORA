"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import type { AvatarProps } from "./adapter";
import { Figure } from "./Figure";

export type ViewName = "front" | "back" | "left" | "right";
export type StageApi = { view: (v: ViewName) => void; reset: () => void; zoom: (factor: number) => void };
const TARGET = new THREE.Vector3(0, 0.88, 0);
const HOME = { az: 0.0, polar: Math.PI / 2 - 0.06, dist: 4.6 };
const AZ: Record<ViewName, number> = { front: 0, right: Math.PI / 2, back: Math.PI, left: -Math.PI / 2 };

type Goal = { az: number; polar: number; dist: number; until: number; from: { az: number; polar: number; dist: number }; start: number };

function Rig({ api, spin, reduced }: { api: React.MutableRefObject<StageApi | null>; spin: boolean; reduced: boolean }) {
  const camera = useThree((s) => s.camera), controls = useRef<OrbitImpl>(null), goal = useRef<Goal | null>(null);
  const read = () => { const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(TARGET)); return { az: sph.theta, polar: sph.phi, dist: sph.radius }; };
  const go = (to: { az: number; polar: number; dist: number }) => {
    const from = read();
    // shortest way round
    let d = to.az - from.az; d = Math.atan2(Math.sin(d), Math.cos(d));
    goal.current = { ...to, az: from.az + d, from, start: performance.now(), until: performance.now() + (reduced ? 1 : 520) };
  };
  useEffect(() => {
    camera.position.set(0, 0.88 + HOME.dist * Math.cos(HOME.polar), HOME.dist * Math.sin(HOME.polar)); camera.lookAt(TARGET);
    api.current = {
      view: (v) => go({ az: AZ[v], polar: HOME.polar, dist: read().dist }),
      reset: () => go(HOME),
      zoom: (f) => { const c = read(); go({ ...c, dist: Math.min(8, Math.max(1.7, c.dist * f)) }); },
    };
    return () => { api.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFrame(() => {
    const g = goal.current; if (!g) return;
    const t = Math.min(1, (performance.now() - g.start) / (g.until - g.start)), e = 1 - Math.pow(1 - t, 3);
    const az = g.from.az + (g.az - g.from.az) * e, polar = g.from.polar + (g.polar - g.from.polar) * e, dist = g.from.dist + (g.dist - g.from.dist) * e;
    camera.position.set(TARGET.x + dist * Math.sin(polar) * Math.sin(az), TARGET.y + dist * Math.cos(polar), TARGET.z + dist * Math.sin(polar) * Math.cos(az));
    camera.lookAt(TARGET); controls.current?.update();
    if (t >= 1) goal.current = null;
  });
  return <OrbitControls ref={controls} target={TARGET.toArray()} enablePan={false} enableDamping dampingFactor={0.09} minDistance={1.7} maxDistance={8} minPolarAngle={0.35} maxPolarAngle={Math.PI / 2 + 0.25} autoRotate={spin && !reduced} autoRotateSpeed={1.6} />;
}

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl); const room = new RoomEnvironment();
    const tex = pm.fromScene(room, 0.04).texture; scene.environment = tex; scene.environmentIntensity = 0.55;
    return () => { scene.environment = null; tex.dispose(); pm.dispose(); room.dispose(); };
  }, [gl, scene]);
  return null;
}

export default function Stage({ avatar, worn, apiRef, spin, onReady }: AvatarProps & { apiRef: React.MutableRefObject<StageApi | null>; spin: boolean; onReady?: () => void }) {
  const reduced = useMemo(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const readyOnce = useRef(false);
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ fov: 30, near: 0.1, far: 40 }} gl={{ antialias: true, preserveDrawingBuffer: false }} style={{ touchAction: "none" }}
      onCreated={() => { if (!readyOnce.current) { readyOnce.current = true; onReady?.(); } }} aria-label="3D outfit preview" role="img">
      <color attach="background" args={["#e9e6df"]} />
      <Env />
      <hemisphereLight args={["#ffffff", "#bdb6a8", 0.7]} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-1.5} shadow-camera-right={1.5} shadow-camera-top={2.2} shadow-camera-bottom={-0.2} />
      <directionalLight position={[-3, 2, -3]} intensity={0.7} />
      <Figure avatar={avatar} worn={worn} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow><circleGeometry args={[1.25, 64]} /><meshStandardMaterial color="#d6d1c7" roughness={0.95} /></mesh>
      <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={4} blur={2.4} far={2} />
      <Rig api={apiRef} spin={spin} reduced={!!reduced} />
    </Canvas>
  );
}
