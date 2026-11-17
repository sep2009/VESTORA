import type { ThreeElements } from "@react-three/fiber";
import type { BufferGeometry, Material } from "three";

/** A mesh using shared cached geometry and material (never disposed by React; the caches own them). */
export function Part({ geo, mat, shadow = true, ...rest }: { geo: BufferGeometry; mat: Material; shadow?: boolean } & Omit<ThreeElements["mesh"], "geometry" | "material">) {
  return <mesh geometry={geo} material={mat} castShadow={shadow} receiveShadow {...rest} />;
}
