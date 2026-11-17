import * as THREE from "three";
import type { ItemKind } from "@/modules/showroom/types";
import { Garment } from "./Procedural";

const vary = (c: string, i: number) => `#${new THREE.Color(c).offsetHSL(0, 0, (i % 3 - 1) * 0.05).getHexString()}`;

/** Chrome rail on two uprights, garments hanging in a staggered row. Faces +z. */
export function ClothingRack({ kind, color, count = 6 }: { kind: ItemKind; color: string; count?: number }) {
  const chrome = <meshStandardMaterial color="#c9ccd1" metalness={0.9} roughness={0.25} />;
  const railY = 1.62;
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 1.05, railY / 2, 0]} castShadow><cylinderGeometry args={[0.018, 0.018, railY, 8]} />{chrome}</mesh>
          <mesh position={[s * 1.05, 0.02, 0]} castShadow><boxGeometry args={[0.06, 0.04, 0.7]} />{chrome}</mesh>
        </group>
      ))}
      <mesh position={[0, railY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.016, 0.016, 2.1, 8]} />{chrome}</mesh>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} position={[-0.8 + (1.6 / (count - 1)) * i, railY - 0.04, 0]} rotation={[0, Math.PI / 2 - 0.55, 0]}>
          <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.012, 0.06, 0.012]} />{chrome}</mesh>
          <Garment kind={kind} color={vary(color, i)} />
        </group>
      ))}
    </group>
  );
}
