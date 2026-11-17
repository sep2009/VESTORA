"use client";
import { ZONE_SIZE } from "@/modules/showroom/layout";
import { DepartmentSign } from "./DepartmentSign";

/** Street-side portal in front of the entrance hall: pillars, lintel, canopy, steps, glass doors and a path. Placed at the hall's south edge. */
export function MainEntrance({ position }: { position: readonly [number, number, number] }) {
  const stone = <meshStandardMaterial color="#e8e4dc" roughness={0.6} />;
  const dark = <meshStandardMaterial color="#141416" roughness={0.5} />;
  return (
    <group position={[position[0], 0, position[2] + ZONE_SIZE / 2 + 0.4]}>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 3.4, 3.1, 0]} castShadow receiveShadow><boxGeometry args={[0.8, 6.2, 0.9]} />{stone}</mesh>)}
      <mesh position={[0, 6.1, 0]} castShadow receiveShadow><boxGeometry args={[8, 1.3, 0.9]} />{dark}</mesh>
      <DepartmentSign title="Vestora" subtitle="Fashion, exhibited" style={{ bg: "#141416", fg: "#f5f3ef", sub: "#ff8a5c" }} accent="#ff5a1f" width={6.4} height={1.05} position={[0, 6.1, 0.52]} />
      <mesh position={[0, 6.9, 0.9]} castShadow><boxGeometry args={[8.6, 0.12, 2.2]} />{stone}</mesh>
      {/* glass doors, slightly ajar */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.4, 0, 0.1]} rotation={[0, s * -0.5, 0]}>
          <mesh position={[0, 2.5, 0]}><boxGeometry args={[1.35, 5, 0.05]} /><meshStandardMaterial color="#cfe6ee" transparent opacity={0.28} roughness={0.05} depthWrite={false} /></mesh>
          <mesh position={[0, 2.5, 0]}><boxGeometry args={[1.4, 5.05, 0.03]} /><meshStandardMaterial color="#2a2a2e" wireframe /></mesh>
        </group>
      ))}
      {[0, 1, 2].map((i) => <mesh key={i} position={[0, 0.07 + 0 * i, 1.2 + i * 0.7]} receiveShadow><boxGeometry args={[7.2 + i * 0.6, 0.14, 0.7]} />{stone}</mesh>)}
      <mesh position={[0, 0.005, 5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[7.2, 8]} /><meshStandardMaterial color="#cfcac0" roughness={0.9} /></mesh>
      <mesh position={[0, 0.02, 5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.2, 8]} /><meshStandardMaterial color="#ff5a1f" emissive="#ff5a1f" emissiveIntensity={0.2} /></mesh>
    </group>
  );
}
