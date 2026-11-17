"use client";
import { ZONES } from "@/modules/showroom/layout";

/** One soft shadow-casting key light, a sky/ground fill, and a coloured point light per zone for identity. */
export function LightingSystem() {
  return (
    <>
      <hemisphereLight args={["#fff8ee", "#b8b2a6", 1.1]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[34, 58, 30]} intensity={2.2} castShadow
        shadow-mapSize={[4096, 4096]} shadow-camera-left={-48} shadow-camera-right={48}
        shadow-camera-top={48} shadow-camera-bottom={-48} shadow-camera-near={10} shadow-camera-far={160}
        shadow-bias={-0.0004} shadow-normalBias={0.05} shadow-radius={3}
      />
      {ZONES.map((z) => (
        <pointLight key={z.id} position={[z.center[0], 4.6, z.center[1] + 0.5]} color={z.palette.light}
          intensity={55 * z.palette.lightIntensity} distance={17} decay={1.6} />
      ))}
    </>
  );
}
