"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Entry = { status: "loading" | "ready" | "failed"; scene?: THREE.Object3D };
const cache = new Map<string, Entry>();
const waiting = new Map<string, Promise<void>>();

/** Non-throwing GLB/GLTF load: any network, parse or format error becomes status "failed". */
function load(url: string): Promise<void> {
  const hit = waiting.get(url);
  if (hit) return hit;
  cache.set(url, { status: "loading" });
  const p = new Promise<void>((resolve) => {
    new GLTFLoader().load(
      url,
      (gltf) => { cache.set(url, { status: "ready", scene: gltf.scene }); resolve(); },
      undefined,
      () => { cache.set(url, { status: "failed" }); resolve(); },
    );
  });
  waiting.set(url, p);
  return p;
}

function normalized(scene: THREE.Object3D, height: number) {
  const clone = scene.clone(true);
  clone.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  const s = size.y > 0 ? height / size.y : 1;
  const offset = new THREE.Vector3(-(box.min.x + size.x / 2) * s, -box.min.y * s, -(box.min.z + size.z / 2) * s);
  return { clone, s, offset };
}

/**
 * Shows a GLB/GLTF normalised to `height` metres, sitting on y=0. While it loads, and if it
 * is missing or invalid, the procedural fallback is shown instead, so a display is never empty.
 */
export function ModelOrFallback({ url, height, fallback }: { url: string; height: number; fallback: ReactNode }) {
  const [, tick] = useState(0);
  useEffect(() => {
    let alive = true;
    void load(url).then(() => { if (alive) tick((n) => n + 1); });
    return () => { alive = false; };
  }, [url]);
  const entry = cache.get(url);
  const scene = entry?.status === "ready" ? entry.scene : undefined;
  const prepared = useMemo(() => (scene ? normalized(scene, height) : null), [scene, height]);
  if (!prepared) return <>{fallback}</>;
  return <group position={prepared.offset}><primitive object={prepared.clone} scale={prepared.s} /></group>;
}
