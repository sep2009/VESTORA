"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { Environment, Lightformer } from "@react-three/drei";
import { ZONES } from "@/modules/showroom/layout";
import { useQuality } from "@/stores/quality-store";

/** One warm spot per room, aimed at the room's display area. No shadows (ambient occlusion and the sun carry those). */
function RoomSpot({ x, z, color, intensity }: { x: number; z: number; color: string; intensity: number }) {
  const target = useMemo(() => new THREE.Object3D(), []);
  return (
    <group>
      <spotLight position={[x, 5.2, z - 3]} target={target} color={color} intensity={intensity} angle={0.95} penumbra={1} distance={17} decay={1.7} />
      <primitive object={target} position={[x, 0.6, z + 0.5]} />
    </group>
  );
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
        position={[34, 58, 30]} intensity={1.9} color="#fff1dd" castShadow
        shadow-mapSize={high ? [4096, 4096] : [1536, 1536]}
        shadow-camera-left={-48} shadow-camera-right={48} shadow-camera-top={48} shadow-camera-bottom={-48}
        shadow-camera-near={10} shadow-camera-far={160} shadow-bias={-0.0003} shadow-normalBias={0.04}
      />
      {high && ZONES.map((z) => <RoomSpot key={z.id} x={z.center[0]} z={z.center[1]} color={z.palette.light} intensity={90 * z.palette.lightIntensity} />)}
    </>
  );
}
