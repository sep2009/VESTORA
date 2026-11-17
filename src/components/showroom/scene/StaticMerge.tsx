"use client";
import { useLayoutEffect, useRef, type ComponentProps } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Performance: merges every static, opaque mesh below it into one mesh per material (and shadow flags).
 * Hundreds of walls, trims and fixtures become a few dozen draw calls. The original meshes stay in the
 * tree (hidden) so React, picking and cleanup keep working. Instanced, transparent and multi-material
 * meshes are left alone. Do NOT wrap anything that animates or is interactive per object.
 */
export function StaticMerge({ children, ...group }: ComponentProps<"group">) {
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const g = root.current;
    if (!g) return;
    g.updateWorldMatrix(true, true);
    const inv = g.matrixWorld.clone().invert();
    const buckets = new Map<string, { material: THREE.Material; cast: boolean; recv: boolean; geos: THREE.BufferGeometry[]; src: THREE.Mesh[] }>();
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || Array.isArray(m.material) || !m.visible) return;
      const mat = m.material as THREE.Material;
      if (mat.transparent) return;
      const key = `${mat.uuid}|${m.castShadow}|${m.receiveShadow}`;
      let b = buckets.get(key);
      if (!b) { b = { material: mat, cast: m.castShadow, recv: m.receiveShadow, geos: [], src: [] }; buckets.set(key, b); }
      const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
      for (const name of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(name)) geo.deleteAttribute(name);
      if (!geo.attributes.uv) geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array((geo.attributes.position as THREE.BufferAttribute).count * 2), 2));
      geo.applyMatrix4(inv.clone().multiply(m.matrixWorld));
      b.geos.push(geo); b.src.push(m);
    });
    const added: THREE.Mesh[] = [];
    const hidden: THREE.Mesh[] = [];
    buckets.forEach((b) => {
      const merged = mergeGeometries(b.geos, false);
      b.geos.forEach((x) => x.dispose());
      if (!merged) return;
      const mesh = new THREE.Mesh(merged, b.material);
      mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.matrixAutoUpdate = false; mesh.userData.merged = true;
      g.add(mesh); added.push(mesh);
      b.src.forEach((s) => { s.visible = false; hidden.push(s); });
    });
    return () => {
      added.forEach((m) => { g.remove(m); m.geometry.dispose(); });
      hidden.forEach((s) => { s.visible = true; });
    };
  }, []);
  return <group ref={root} {...group}>{children}</group>;
}
