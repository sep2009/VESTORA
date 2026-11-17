"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

/** Empty showroom shell: floor, back wall, lighting, orbit camera. Products are mounted here in a later stage. */
export default function ShowroomScene() {
  return (
    <Canvas camera={{ position: [0, 1.6, 6], fov: 50 }} shadows>
      <color attach="background" args={["#1b1b26"]} />
      <ambientLight intensity={0.4} />
      <spotLight position={[4, 6, 4]} angle={0.5} penumbra={0.6} intensity={150} castShadow />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#3a3a4c" roughness={0.5} />
      </mesh>
      <mesh position={[0, 3, -6]}>
        <planeGeometry args={[30, 6]} />
        <meshStandardMaterial color="#2a2a3a" />
      </mesh>
      <hemisphereLight args={["#ffffff", "#444466", 1.2]} />
      <OrbitControls enablePan={false} minDistance={2} maxDistance={10} maxPolarAngle={Math.PI / 2.05} target={[0, 1.2, 0]} />
    </Canvas>
  );
}
