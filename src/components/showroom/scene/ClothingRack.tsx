"use client";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ItemKind } from "@/modules/showroom/types";
import { garmentGeometry, hangerGeometry } from "./pbr/geometry";
import { brushedMetal, fabric, paint } from "./pbr/materials";
import { fabricColor } from "./Procedural";
import { Part } from "./Part";

/** Draws many copies of one geometry in a single draw call, each with its own transform and tint. */
function Instances({ geo, mat, items }: { geo: THREE.BufferGeometry; mat: THREE.Material; items: { m: THREE.Matrix4; c?: THREE.Color }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => { mesh.setMatrixAt(i, it.m); if (it.c) mesh.setColorAt(i, it.c); });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} castShadow receiveShadow frustumCulled />;
}

/**
 * Retail garment rail: brushed-steel uprights on a weighted base, a round rail at 1.65 m, and a dense
 * row of garments on wooden hangers (instanced: two draw calls per rack). Faces +z.
 */
export function ClothingRack({ kind, color, count = 11 }: { kind: ItemKind; color: string; count?: number }) {
  const steel = brushedMetal("#cfd1d4");
  const railY = 1.65, len = 1.5;
  const { hangers, garments } = useMemo(() => {
    const base = new THREE.Color(fabricColor(color));
    const hangers: { m: THREE.Matrix4 }[] = [], garments: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    for (let i = 0; i < count; i++) {
      const x = -len / 2 + 0.06 + ((len - 0.12) / (count - 1)) * i;
      const rot = Math.PI / 2 - 0.3 + Math.sin(i * 12.9898) * 0.04;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0));
      hangers.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, railY, 0), q, new THREE.Vector3(1, 1, 1)) });
      const tint = base.clone().offsetHSL(0, 0, ((i * 7) % 5 - 2) * 0.012);
      garments.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, railY - 0.1, 0), q, new THREE.Vector3(1, 1, 1)), c: tint });
    }
    return { hangers, garments };
  }, [color, count]);
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (len / 2 + 0.04), 0, 0]}>
          <Part geo={sharedGeo("rack-up", () => new THREE.CylinderGeometry(0.012, 0.012, railY, 10))} mat={steel} position={[0, railY / 2, 0]} />
          <Part geo={sharedGeo("rack-foot", () => new THREE.BoxGeometry(0.04, 0.025, 0.55))} mat={steel} position={[0, 0.0125, 0]} />
          <Part geo={sharedGeo("rack-cap", () => new THREE.SphereGeometry(0.02, 10, 8))} mat={steel} position={[0, railY, 0]} />
        </group>
      ))}
      <Part geo={sharedGeo("rack-rail", () => new THREE.CylinderGeometry(0.0125, 0.0125, len + 0.08, 12))} mat={steel} position={[0, railY, 0]} rotation={[0, 0, Math.PI / 2]} />
      <Instances geo={hangerGeometry()} mat={paint("#6a4a30", 0.5)} items={hangers} />
      <Instances geo={garmentGeometry(kind)} mat={fabric("#ffffff")} items={garments} />
    </group>
  );
}

import { cachedGeometry } from "./pbr/geometry";
function sharedGeo(key: string, make: () => THREE.BufferGeometry) { return cachedGeometry(key, make); }
