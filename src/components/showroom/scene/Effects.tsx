"use client";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useQuality } from "@/stores/quality-store";

/**
 * Subtle post-processing, high quality only: ambient occlusion for grounded contact shadows, Khronos
 * "neutral" tone mapping (keeps product colours faithful) and a very light vignette. No bloom, no depth of field.
 * In Lite the renderer's own neutral tone mapping is used and the composer is not created at all.
 */
export function Effects() {
  const high = useQuality((s) => s.level === "high");
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMapping = high ? THREE.NoToneMapping : THREE.NeutralToneMapping;
    gl.toneMappingExposure = 0.95;
  }, [gl, high]);
  if (!high) return null;
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <N8AO aoRadius={1.1} distanceFalloff={1.4} intensity={2.2} quality="medium" halfRes color="#1a1612" />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Vignette offset={0.32} darkness={0.28} />
    </EffectComposer>
  );
}
