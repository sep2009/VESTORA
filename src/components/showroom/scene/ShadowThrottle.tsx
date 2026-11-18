"use client";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { selectFocusedProductId, useCameraStore } from "@/stores/camera-store";

/**
 * Performance: the building and its fixtures are static, so the shadow map is rendered only a few times while things load
 * (textures and models arrive late) and again when focus changes, instead of re-drawing every shadow caster several times a second.
 * Re-rendering ~800 casters four times a second caused a visible hitch while scrolling.
 */
export function ShadowThrottle() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    const refresh = () => { gl.shadowMap.needsUpdate = true; };
    refresh();
    const timers = [400, 1500, 4000].map((ms) => setTimeout(refresh, ms));
    const unsub = useCameraStore.subscribe((s, prev) => { if (selectFocusedProductId(s) !== selectFocusedProductId(prev)) setTimeout(refresh, 600); });
    return () => { timers.forEach(clearTimeout); unsub(); gl.shadowMap.autoUpdate = true; };
  }, [gl]);
  return null;
}
