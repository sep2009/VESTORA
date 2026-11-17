"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshStandardMaterial } from "three";
import { getZone, ZONE_SIZE } from "@/modules/showroom/layout";
import { useCameraStore, selectFocusedZoneId } from "@/stores/camera-store";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/** Glowing frame on the floor of the room the camera was sent to. Pulses gently unless motion is reduced. */
export function ZoneHighlight() {
  const id = useCameraStore(selectFocusedZoneId);
  const reduced = useReducedMotion();
  const mats = useRef<(MeshStandardMaterial | null)[]>([]);
  useFrame(({ clock }) => {
    const k = reduced ? 0.7 : 0.6 + Math.sin(clock.elapsedTime * 2) * 0.25;
    mats.current.forEach((m) => { if (m) m.emissiveIntensity = k; });
  });
  if (!id) return null;
  const zone = getZone(id);
  const s = ZONE_SIZE - 0.2;
  const color = zone.palette.accent === "#2e2e2f" ? "#e9e4d8" : zone.palette.accent;
  const bars: [number, number, number, number][] = [[0, -s / 2, s, 0.16], [0, s / 2, s, 0.16], [-s / 2, 0, 0.16, s], [s / 2, 0, 0.16, s]];
  return (
    <group position={[zone.center[0], 0.06, zone.center[1]]}>
      {bars.map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0, z]} ref={(m: Mesh | null) => { mats.current[i] = (m?.material as MeshStandardMaterial) ?? null; }}>
          <boxGeometry args={[w, 0.04, d]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
}
