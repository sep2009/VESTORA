"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { ZONES } from "@/modules/showroom/layout";
import { useQuality } from "@/stores/quality-store";

const SPOTS = 3;
/**
 * Warm spots follow the camera: only the rooms nearest to where the camera looks get one. A fixed number of lights (no shader
 * recompiles) instead of one per room, because every light is evaluated for every pixel of every material.
 */
function RoomSpots() {
  const camera = useThree((s) => s.camera);
  const refs = useRef<(THREE.SpotLight | null)[]>([]);
  const targets = useMemo(() => Array.from({ length: SPOTS }, () => new THREE.Object3D()), []);
  const acc = useRef(1), look = useMemo(() => new THREE.Vector3(), []), dir = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    acc.current += dt; if (acc.current < 0.25) return; acc.current = 0;
    camera.getWorldDirection(dir); look.copy(camera.position).addScaledVector(dir, 22); // roughly the floor the camera is looking at
    const near = ZONES.map((z) => ({ z, d: Math.hypot(z.center[0] - look.x, z.center[1] - look.z) })).sort((a, b) => a.d - b.d).slice(0, SPOTS);
    near.forEach(({ z }, i) => {
      const l = refs.current[i]; if (!l) return;
      l.position.set(z.center[0], 5.2, z.center[1] - 3); l.color.set(z.palette.light); l.intensity = 90 * z.palette.lightIntensity;
      targets[i]!.position.set(z.center[0], 0.6, z.center[1] + 0.5); targets[i]!.updateMatrixWorld();
    });
  });
  return <>{targets.map((t, i) => (
    <group key={i}>
      <spotLight ref={(l) => { refs.current[i] = l; }} position={[0, 5.2, 0]} target={t} color="#ffe4c0" intensity={0} angle={0.95} penumbra={1} distance={17} decay={1.7} />
      <primitive object={t} />
    </group>))}</>;
}

/**
 * Lighting for an architectural interior photograph:
 *  - a procedural studio environment (soft box overhead, window-like side panels, floor bounce) for reflections and ambient fill;
 *  - one warm, soft directional "sun" that casts the shadows;
 *  - a faint hemisphere fill;
 *  - a warm spot per room (high quality only).
 * Nothing here glows: no neon, no coloured point lights.
 */
export function LightingSystem() {
  const high = useQuality((s) => s.level === "high");
  return (
    <>
      <Environment resolution={high ? 256 : 128} frames={1} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={2.4} color="#fff3e2" position={[0, 14, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[44, 44, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#eaf1ff" position={[-26, 8, 6]} rotation={[0, Math.PI / 2, 0]} scale={[30, 10, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#fff0dc" position={[26, 8, 10]} rotation={[0, -Math.PI / 2, 0]} scale={[30, 10, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#d8cdb9" position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[44, 44, 1]} />
      </Environment>
      <hemisphereLight args={["#f6f1e8", "#9d958a", 0.22]} />
      <directionalLight
        position={[34, 58, 46]} intensity={1.9} color="#fff1dd" castShadow
        shadow-mapSize={high ? [3072, 3072] : [1536, 1536]}
        shadow-camera-left={-66} shadow-camera-right={66} shadow-camera-top={66} shadow-camera-bottom={-66}
        shadow-camera-near={10} shadow-camera-far={190} shadow-bias={-0.0003} shadow-normalBias={0.04}
      />
      {high && <RoomSpots />}
    </>
  );
}
