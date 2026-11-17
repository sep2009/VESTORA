"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/** Clean exhibition hall: pale floor, plaster wall, soft key light. Products mount here in the showroom stage. */
export default function ShowroomScene() {
  const reduced = useReducedMotion();
  return (
    <Canvas camera={{ position: [0, 1.7, 7], fov: 48 }} shadows dpr={[1, 2]} aria-label="3D showroom">
      <color attach="background" args={["#ebe8e1"]} />
      <hemisphereLight args={["#ffffff", "#d6d1c6", 2.6]} />
      <spotLight position={[3, 7, 5]} angle={0.55} penumbra={0.8} intensity={180} castShadow />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#dcd8cf" roughness={0.55} />
      </mesh>
      <mesh position={[0, 3, -7]} receiveShadow>
        <planeGeometry args={[40, 6]} />
        <meshStandardMaterial color="#faf8f3" />
      </mesh>
      {[-3, 0, 3].map((x) => (
        <mesh key={x} position={[x, 0.15, -2]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.3, 1.6]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      ))}
      <OrbitControls enablePan={false} enableDamping={!reduced} minDistance={3} maxDistance={11} maxPolarAngle={Math.PI / 2.05} target={[0, 1.1, 0]} />
    </Canvas>
  );
}
