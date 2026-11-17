"use client";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { ItemKind } from "@/modules/showroom/types";
import { garmentGeometry, hangerGeometry, cachedGeometry } from "./pbr/geometry";
import { brushedMetal, fabric, paint } from "./pbr/materials";
import { fabricColor } from "./Procedural";
import { Part } from "./Part";

export type RackItem = { id: string; kind: ItemKind; color: string };

type Item = { m: THREE.Matrix4; c?: THREE.Color };
/** Draws many copies of one geometry in a single draw call. Pointer events report which instance was hit. */
function Instances({ geo, mat, items, ids, onHover, onPick }: { geo: THREE.BufferGeometry; mat: THREE.Material; items: Item[]; ids?: string[]; onHover?: (id: string | null) => void; onPick?: (id: string) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => { mesh.setMatrixAt(i, it.m); if (it.c) mesh.setColorAt(i, it.c); });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  const idOf = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.instanceId !== undefined ? ids?.[e.instanceId] : undefined);
  return (
    <instancedMesh
      ref={ref} args={[geo, mat, items.length]} castShadow receiveShadow
      onPointerOver={ids ? (e) => { e.stopPropagation(); const id = idOf(e); if (id) onHover?.(id); } : undefined}
      onPointerMove={ids ? (e) => { e.stopPropagation(); const id = idOf(e); if (id) onHover?.(id); } : undefined}
      onPointerOut={ids ? () => onHover?.(null) : undefined}
      onClick={ids ? (e) => { e.stopPropagation(); const id = idOf(e); if (id) onPick?.(id); } : undefined}
    />
  );
}

/**
 * Retail garment rail: brushed-steel uprights, round rail at 1.65 m and one wooden hanger per product.
 * Each hanging garment IS a different catalog product (never copies of one item). Instanced per garment type.
 */
export function ClothingRack({ items, onHover, onPick }: { items: RackItem[]; onHover: (id: string | null) => void; onPick: (id: string) => void }) {
  const steel = brushedMetal("#cfd1d4");
  const railY = 1.65, len = 1.5;
  const { hangers, groups } = useMemo(() => {
    const n = items.length, pitch = Math.min(0.17, (len - 0.2) / Math.max(1, n - 1));
    const hangers: Item[] = [];
    const groups = new Map<ItemKind, { items: Item[]; ids: string[] }>();
    items.forEach((it, i) => {
      const x = (i - (n - 1) / 2) * pitch;
      const rot = Math.PI / 2 - 0.45 + Math.sin(i * 12.9898) * 0.05;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0));
      hangers.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, railY, 0), q, new THREE.Vector3(1, 1, 1)) });
      const g = groups.get(it.kind) ?? { items: [], ids: [] };
      g.items.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, railY - 0.1, 0), q, new THREE.Vector3(1, 1, 1)), c: new THREE.Color(fabricColor(it.color)) });
      g.ids.push(it.id); groups.set(it.kind, g);
    });
    return { hangers, groups: [...groups.entries()] };
  }, [items]);
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (len / 2 + 0.04), 0, 0]}>
          <Part geo={cachedGeometry("rack-up", () => new THREE.CylinderGeometry(0.012, 0.012, railY, 10))} mat={steel} position={[0, railY / 2, 0]} />
          <Part geo={cachedGeometry("rack-foot", () => new THREE.BoxGeometry(0.04, 0.025, 0.55))} mat={steel} position={[0, 0.0125, 0]} />
          <Part geo={cachedGeometry("rack-cap", () => new THREE.SphereGeometry(0.02, 10, 8))} mat={steel} position={[0, railY, 0]} />
        </group>
      ))}
      <Part geo={cachedGeometry("rack-rail", () => new THREE.CylinderGeometry(0.0125, 0.0125, len + 0.08, 12))} mat={steel} position={[0, railY, 0]} rotation={[0, 0, Math.PI / 2]} />
      <Instances geo={hangerGeometry()} mat={paint("#6a4a30", 0.5)} items={hangers} />
      {groups.map(([kind, g]) => (
        <Instances key={kind} geo={garmentGeometry(kind)} mat={fabric("#ffffff")} items={g.items} ids={g.ids} onHover={onHover} onPick={onPick} />
      ))}
    </group>
  );
}
