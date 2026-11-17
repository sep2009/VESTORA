"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { cameraManager } from "@/modules/showroom/camera/manager";
import type { ResolvedDisplay } from "@/modules/showroom/types";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/** Connects the R3F camera and orbit controls to the camera manager. It owns no camera logic itself. */
export function CameraDirector({ displays }: { displays: readonly ResolvedDisplay[] }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useRef<OrbitControlsImpl>(null);
  const reduced = useReducedMotion();
  const aspect = size.width / size.height;

  // The product → fixture map must exist before attach() runs queued deep-link requests.
  useEffect(() => { cameraManager.setDisplays(displays); }, [displays]);
  useEffect(() => {
    if (!controls.current) return;
    cameraManager.attach(camera as PerspectiveCamera, controls.current, aspect, reduced);
    return () => cameraManager.detach();
    // attach once per camera; aspect and reduced motion are kept in sync by the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);
  useEffect(() => { cameraManager.setAspect(aspect); }, [aspect]);
  useEffect(() => { cameraManager.setReduced(reduced); }, [reduced]);
  useFrame((_, dt) => cameraManager.update(Math.min(dt, 0.05)));

  return <OrbitControls ref={controls} makeDefault enablePan={false} />;
}
