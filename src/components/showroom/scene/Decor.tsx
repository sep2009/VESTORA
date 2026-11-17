import type { ZoneId, ZonePalette } from "@/modules/showroom/types";

type V3 = readonly [number, number, number];
const M = ({ c, r = 0.7, m = 0, e, ei = 0 }: { c: string; r?: number; m?: number; e?: string; ei?: number }) =>
  <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e ?? "#000000"} emissiveIntensity={ei} />;

export function Plant({ position, scale = 1 }: { position: V3; scale?: number }) {
  return (
    <group position={[...position]} scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[0.32, 0.25, 0.6, 14]} /><M c="#d8d2c6" r={0.6} /></mesh>
      {[[0, 1.0, 0, 0.5], [0.22, 0.85, 0.1, 0.34], [-0.2, 1.2, -0.1, 0.38], [0.05, 1.45, 0.05, 0.3]].map(([x, y, z, s], i) => (
        <mesh key={i} position={[x!, y!, z!]} castShadow><sphereGeometry args={[s!, 14, 10]} /><M c={i % 2 ? "#3f7a4f" : "#2f6a43"} r={0.9} /></mesh>
      ))}
    </group>
  );
}

export function Bench({ position, rotationY = 0, color = "#6b4a30", length = 2.2 }: { position: V3; rotationY?: number; color?: string; length?: number }) {
  return (
    <group position={[...position]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow><boxGeometry args={[length, 0.14, 0.6]} /><M c={color} r={0.6} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (length / 2 - 0.2), 0.2, 0]} castShadow><boxGeometry args={[0.1, 0.4, 0.5]} /><M c="#222" /></mesh>)}
    </group>
  );
}

export function Sofa({ position, rotationY = 0, color = "#8a9a8c" }: { position: V3; rotationY?: number; color?: string }) {
  return (
    <group position={[...position]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow><boxGeometry args={[2.6, 0.5, 1]} /><M c={color} r={0.95} /></mesh>
      <mesh position={[0, 0.75, -0.4]} castShadow><boxGeometry args={[2.6, 0.55, 0.22]} /><M c={color} r={0.95} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 1.2, 0.55, 0]} castShadow><boxGeometry args={[0.22, 0.5, 1]} /><M c={color} r={0.95} /></mesh>)}
    </group>
  );
}

export function Rug({ position, size, round = false, color, border }: { position: V3; size: readonly [number, number]; round?: boolean; color: string; border?: string }) {
  return (
    <group position={[...position]} rotation={[-Math.PI / 2, 0, 0]}>
      {round
        ? <>{border && <mesh><circleGeometry args={[size[0] / 2 + 0.12, 48]} /><M c={border} r={0.4} m={0.6} /></mesh>}<mesh position={[0, 0, 0.002]}><circleGeometry args={[size[0] / 2, 48]} /><M c={color} r={0.95} /></mesh></>
        : <>{border && <mesh><planeGeometry args={[size[0] + 0.24, size[1] + 0.24]} /><M c={border} r={0.4} m={0.6} /></mesh>}<mesh position={[0, 0, 0.002]}><planeGeometry args={size} /><M c={color} r={0.95} /></mesh></>}
    </group>
  );
}

function Chandelier({ position, color }: { position: V3; color: string }) {
  return (
    <group position={[...position]}>
      <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.015, 0.015, 1.4, 6]} /><M c="#222" /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.1, 0.04, 8, 40]} /><M c="#d4af37" m={0.9} r={0.25} /></mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 1.1, -0.08, Math.sin(a) * 1.1]}><sphereGeometry args={[0.09, 10, 8]} /><M c={color} e={color} ei={2.5} /></mesh>;
      })}
    </group>
  );
}

function Column({ position, color, cap }: { position: V3; color: string; cap: string }) {
  return (
    <group position={[...position]}>
      <mesh position={[0, 2.75, 0]} castShadow receiveShadow><cylinderGeometry args={[0.36, 0.4, 5.5, 20]} /><M c={color} r={0.4} /></mesh>
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.5, 0.5, 0.24, 20]} /><M c={cap} m={0.8} r={0.3} /></mesh>
      <mesh position={[0, 5.3, 0]}><cylinderGeometry args={[0.5, 0.5, 0.3, 20]} /><M c={cap} m={0.8} r={0.3} /></mesh>
    </group>
  );
}

function Neon({ position, size, color }: { position: V3; size: V3; color: string }) {
  return <mesh position={[...position]}><boxGeometry args={[...size]} /><M c={color} e={color} ei={3} /></mesh>;
}

const Crate = ({ position, c = "#59595f" }: { position: V3; c?: string }) =>
  <mesh position={[...position]} castShadow receiveShadow><boxGeometry args={[0.9, 0.8, 0.9]} /><M c={c} r={0.8} /></mesh>;

function Pendant({ position, color }: { position: V3; color: string }) {
  return (
    <group position={[...position]}>
      <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.01, 0.01, 1.8, 6]} /><M c="#222" /></mesh>
      <mesh><sphereGeometry args={[0.22, 16, 12]} /><M c={color} e={color} ei={2.2} /></mesh>
    </group>
  );
}

/** Zone-specific architecture and furniture that is not a product display. Local coordinates, zone centre = origin. */
export function ZoneDecor({ id, palette }: { id: ZoneId; palette: ZonePalette }) {
  switch (id) {
    case "luxury": return (
      <group>
        <Column position={[-7.1, 0, -7.1]} color="#e9e2d2" cap={palette.trim} />
        <Column position={[7.1, 0, -7.1]} color="#e9e2d2" cap={palette.trim} />
        <Chandelier position={[0, 4.5, 0.5]} color={palette.light} />
        <Rug position={[0.2, 0.02, 1]} size={[5, 5]} round color={palette.accent2} border={palette.trim} />
        <Bench position={[0.3, 0, 4.4]} color={palette.accent2} length={2.6} />
        <mesh position={[0, 0.025, 1]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.12, 15]} /><M c={palette.trim} m={0.9} r={0.3} /></mesh>
      </group>);
    case "streetwear": return (
      <group>
        <Neon position={[-5.2, 4.55, -7.5]} size={[2.6, 0.1, 0.1]} color={palette.accent2} />
        <Neon position={[5.2, 4.55, -7.5]} size={[2.6, 0.1, 0.1]} color={palette.accent} />
        <Neon position={[0, 3.5, -7.5]} size={[0.1, 0.9, 0.1]} color={palette.accent2} />
        <Crate position={[6.5, 0.4, 5.6]} /><Crate position={[6.5, 0.4, 4.6]} c="#6b6b72" /><Crate position={[6.5, 1.2, 5.1]} c="#4a4a50" />
        <Bench position={[-2, 0, 4.4]} color="#8a8a90" />
        <mesh position={[0, 0.025, 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[12, 0.35]} /><M c={palette.accent} e={palette.accent} ei={0.4} /></mesh>
        <mesh position={[0, 0.025, 2.7]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[8, 0.12]} /><M c={palette.accent2} e={palette.accent2} ei={0.4} /></mesh>
      </group>);
    case "minimal": return (
      <group>
        <mesh position={[0, 4.6, 0]}><boxGeometry args={[9, 0.07, 0.2]} /><M c="#ffffff" e="#ffffff" ei={2} /></mesh>
        {[-3.2, 3.2].map((x) => <mesh key={x} position={[x, 4.9, 0]}><cylinderGeometry args={[0.008, 0.008, 1.2, 4]} /><M c="#444" /></mesh>)}
        <mesh position={[-2.2, 0.25, 4.4]} castShadow receiveShadow><boxGeometry args={[0.9, 0.5, 0.9]} /><M c="#eceae4" r={0.5} /></mesh>
        <mesh position={[-2.2, 0.85, 4.4]} castShadow><sphereGeometry args={[0.35, 24, 18]} /><M c="#2b2b2b" r={0.3} m={0.3} /></mesh>
        <Bench position={[3.2, 0, -2.6]} color="#d8d5cd" length={2.8} />
        <mesh position={[5.5, 0.1, 0.5]} receiveShadow><boxGeometry args={[2.2, 0.2, 2.2]} /><M c="#e6e3dc" r={0.5} /></mesh>
      </group>);
    case "casual": return (
      <group>
        <Plant position={[-7, 0, -7.1]} scale={1.3} /><Plant position={[7, 0, -7.1]} scale={1.3} /><Plant position={[7, 0, 5.8]} />
        <Sofa position={[-4.6, 0, 5.4]} />
        <Rug position={[-1.5, 0.02, 4.4]} size={[4.4, 2.8]} color={palette.accent} border="#f0e6d0" />
        {Array.from({ length: 15 }, (_, i) => {
          const x = -6 + i * (12 / 14);
          return <mesh key={i} position={[x, 3.75 - Math.sin((i / 14) * Math.PI) * 0.35, -7.4]}><sphereGeometry args={[0.07, 8, 6]} /><M c="#fff2c8" e="#ffe3a0" ei={2.5} /></mesh>;
        })}
        <mesh position={[0, 0.27, 2.6]} castShadow><cylinderGeometry args={[0.7, 0.7, 0.04, 24]} /><M c="#d9c3a0" r={0.5} /></mesh>
        <mesh position={[0, 0.14, 2.6]}><cylinderGeometry args={[0.05, 0.05, 0.26, 8]} /><M c="#333" /></mesh>
      </group>);
    case "formal": return (
      <group>
        {[-5.6, -2.8, 2.8, 5.6].map((x) => <mesh key={x} position={[x, 2.2, -7.5]} castShadow><boxGeometry args={[0.45, 4.4, 0.25]} /><M c="#2a3350" r={0.5} /></mesh>)}
        <Rug position={[0, 0.02, 0]} size={[2.4, 14]} color={palette.accent} border={palette.trim} />
        <Chandelier position={[0, 4.5, 0.5]} color={palette.light} />
        {[-5.6, 5.6].map((x) => (
          <group key={x} position={[x, 0, 4.8]} rotation={[0, x < 0 ? 0.5 : -0.5, 0]}>
            <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[1, 0.5, 0.9]} /><M c="#3a2418" r={0.6} /></mesh>
            <mesh position={[0, 0.7, -0.38]} castShadow><boxGeometry args={[1, 0.6, 0.18]} /><M c="#3a2418" r={0.6} /></mesh>
          </group>))}
      </group>);
    case "accessories": return (
      <group>
        {[[-3.5, 0], [0, 0.8], [3.5, 0]].map(([x, z]) => <Pendant key={`${x}`} position={[x!, 4, z!]} color={palette.light} />)}
        <Pendant position={[5.6, 4, 3.6]} color={palette.light} />
        <mesh position={[0, 4.6, -7.5]}><boxGeometry args={[12, 0.06, 0.1]} /><M c={palette.accent} e={palette.accent} ei={1.5} /></mesh>
        <Plant position={[7, 0, -7]} scale={0.9} />
      </group>);
    case "new-arrivals": return (
      <group>
        <mesh position={[0, 4.9, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[3.4, 0.07, 10, 64]} /><M c="#ffffff" e="#ffffff" ei={2.4} /></mesh>
        <mesh position={[0, 0.03, -0.4]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.6, 48]} /><M c={palette.accent} e={palette.accent} ei={0.15} r={0.5} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 3.4, 4.9 + 0.5, 0]}><cylinderGeometry args={[0.008, 0.008, 1, 4]} /><M c="#444" /></mesh>)}
      </group>);
    case "entrance": return (
      <group>
        <mesh position={[-4.4, 0.55, -3]} castShadow receiveShadow><boxGeometry args={[3.2, 1.1, 0.9]} /><M c="#f4f2ee" r={0.4} /></mesh>
        <mesh position={[-4.4, 1.13, -3]} castShadow><boxGeometry args={[3.3, 0.06, 1]} /><M c={palette.accent} r={0.4} /></mesh>
        <Plant position={[-7, 0, -7]} /><Plant position={[7, 0, -7]} />
        <Bench position={[-5, 0, 4.4]} color="#2a2a2a" /><Bench position={[5, 0, 4.4]} color="#2a2a2a" />
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.4, 16]} /><M c={palette.accent} e={palette.accent} ei={0.15} /></mesh>
      </group>);
    case "lounge": return (
      <group>
        <Rug position={[0, 0.02, 0]} size={[6, 4.4]} color="#8aa08f" border="#e8e1d2" />
        <Sofa position={[0, 0, -2.6]} color="#c98f5a" /><Sofa position={[-3.2, 0, 0.4]} rotationY={Math.PI / 2} color="#7d8f80" />
        <mesh position={[0.4, 0.3, 0.6]} castShadow><cylinderGeometry args={[0.7, 0.7, 0.05, 24]} /><M c="#e8dcc6" r={0.5} /></mesh>
        <mesh position={[0.4, 0.15, 0.6]}><cylinderGeometry args={[0.06, 0.06, 0.3, 8]} /><M c="#333" /></mesh>
        <Plant position={[-7, 0, -7]} scale={1.3} /><Plant position={[7, 0, -7]} />
      </group>);
  }
}
