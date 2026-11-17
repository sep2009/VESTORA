"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { zoneByDepartment } from "@/modules/showroom/layout";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const VIEW_DIR = new THREE.Vector3(0.62, 0.66, 0.78).normalize(); // camera sits south-east, looking north-west
const OVERVIEW = { halfW: 40, halfH: 31 };
const ZONE_VIEW = { halfW: 11.5, halfH: 8.5 };

/** Distance at which a box of the given half-size fits the viewport at this aspect ratio. */
function fitDistance(fovDeg: number, aspect: number, halfW: number, halfH: number) {
  const t = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
  return Math.max(halfH / t, halfW / (t * aspect));
}

/** Orbit controls plus a smooth fly-to for the active department. User input cancels the fly-to. */
export function CameraRig({ zoneSlug }: { zoneSlug: string | null }) {
  const { camera, size } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const goal = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });
  const flying = useRef(true);
  const first = useRef(true);
  const reduced = useReducedMotion();
  const aspect = size.width / size.height;

  useEffect(() => {
    const zone = zoneSlug ? zoneByDepartment(zoneSlug) : undefined;
    const fov = (camera as THREE.PerspectiveCamera).fov;
    const target = zone ? new THREE.Vector3(zone.center[0], 1.2, zone.center[1]) : new THREE.Vector3(0, 0, 3);
    const box = zone ? ZONE_VIEW : OVERVIEW;
    const dist = THREE.MathUtils.clamp(fitDistance(fov, aspect, box.halfW, box.halfH), 18, 240);
    goal.current.target.copy(target);
    goal.current.pos.copy(target).addScaledVector(VIEW_DIR, dist);
    if (first.current) {
      first.current = false;
      camera.position.copy(goal.current.pos);
      controls.current?.target.copy(target);
      controls.current?.update();
    } else flying.current = true;
  }, [zoneSlug, aspect, camera]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c || !flying.current) return;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3);
    camera.position.lerp(goal.current.pos, k);
    c.target.lerp(goal.current.target, k);
    c.update();
    if (camera.position.distanceTo(goal.current.pos) < 0.05) flying.current = false;
  });

  return (
    <OrbitControls
      ref={controls} makeDefault enablePan={false} enableDamping={!reduced} dampingFactor={0.08}
      minDistance={9} maxDistance={260}
      minPolarAngle={0.35} maxPolarAngle={1.32}
      minAzimuthAngle={-0.1} maxAzimuthAngle={Math.PI / 2 + 0.1}
      onStart={() => { flying.current = false; }}
    />
  );
}
