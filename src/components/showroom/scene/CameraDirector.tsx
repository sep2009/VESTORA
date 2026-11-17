"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { cameraManager } from "@/modules/showroom/camera/manager";
import type { DisplayPlacement } from "@/modules/showroom/types";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/** Connects the R3F camera and orbit controls to the camera manager. It owns no camera logic itself. */
export function CameraDirector({ placements }: { placements: readonly DisplayPlacement[] }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useRef<OrbitControlsImpl>(null);
  const reduced = useReducedMotion();
  const aspect = size.width / size.height;

  useEffect(() => {
    if (!controls.current) return;
    cameraManager.attach(camera as PerspectiveCamera, controls.current, aspect, reduced);
    return () => cameraManager.detach();
    // attach once per camera; aspect and reduced motion are kept in sync by the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);
  useEffect(() => { cameraManager.setAspect(aspect); }, [aspect]);
  useEffect(() => { cameraManager.setReduced(reduced); }, [reduced]);
  useEffect(() => { cameraManager.setDisplays(placements); }, [placements]);
  useFrame((_, dt) => cameraManager.update(Math.min(dt, 0.05)));

  return <OrbitControls ref={controls} makeDefault enablePan={false} />;
}
