"use client";
import { ZONE_SIZE } from "@/modules/showroom/layout";
import { DepartmentSign } from "./DepartmentSign";
import { blackSteel, brass, floor, glass, paint } from "./pbr/materials";

/** Street-side portal in front of the entrance hall: stone piers, steel lintel, canopy, stone steps, glass doors and paving. */
export function MainEntrance({ position }: { position: readonly [number, number, number] }) {
  const stone = floor("travertine", "#d6ccb8", 1, 6);
  return (
    <group position={[position[0], 0, position[2] + ZONE_SIZE / 2 + 0.4]}>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 3.4, 3.1, 0]} castShadow receiveShadow material={stone}><boxGeometry args={[0.8, 6.2, 0.9]} /></mesh>)}
      <mesh position={[0, 6.1, 0]} castShadow receiveShadow material={blackSteel()}><boxGeometry args={[8, 1.3, 0.9]} /></mesh>
      <DepartmentSign title="Vestora" subtitle="Fashion, exhibited" style={{ bg: "#161618", fg: "#e9e4d8", sub: "#b08d57" }} accent="#b08d57" width={6.2} height={1.0} position={[0, 6.1, 0.48]} />
      <mesh position={[0, 6.85, 0.9]} castShadow receiveShadow material={blackSteel()}><boxGeometry args={[8.6, 0.1, 2.2]} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.4, 0, 0.1]} rotation={[0, s * -0.5, 0]}>
          <mesh position={[0, 2.5, 0]} material={glass()}><boxGeometry args={[1.35, 5, 0.02]} /></mesh>
          {[-1, 1].map((e) => <mesh key={e} position={[e * 0.68, 2.5, 0]} castShadow material={blackSteel()}><boxGeometry args={[0.04, 5.04, 0.05]} /></mesh>)}
          <mesh position={[0, 0.05, 0]} castShadow material={blackSteel()}><boxGeometry args={[1.4, 0.1, 0.05]} /></mesh>
          <mesh position={[0, 5.0, 0]} castShadow material={blackSteel()}><boxGeometry args={[1.4, 0.05, 0.05]} /></mesh>
          <mesh position={[s * -0.55, 1.1, 0.05]} castShadow material={brass()}><cylinderGeometry args={[0.014, 0.014, 0.9, 10]} /></mesh>
        </group>
      ))}
      {[0, 1, 2].map((i) => <mesh key={i} position={[0, 0.06 - 0.0 * i, 1.2 + i * 0.7]} castShadow receiveShadow material={stone}><boxGeometry args={[7.2 + i * 0.6, 0.12, 0.7]} /></mesh>)}
      <mesh position={[0, 0.002, 5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floor("concrete", "#a9a69f", 7.2, 8)}><planeGeometry args={[7.2, 8]} /></mesh>
      <mesh position={[0, 0.006, 5]} rotation={[-Math.PI / 2, 0, 0]} material={brass()}><planeGeometry args={[0.05, 8]} /></mesh>
      <mesh position={[0, 0.003, 5]} rotation={[-Math.PI / 2, 0, 0]} material={paint("#7a7770", 0.9)}><planeGeometry args={[1.0, 8]} /></mesh>
    </group>
  );
}
