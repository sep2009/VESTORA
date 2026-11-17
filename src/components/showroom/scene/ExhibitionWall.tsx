import type { ZonePalette } from "@/modules/showroom/types";
import { AccessoryObject } from "./Procedural";

export type WallVariant = "marble" | "slats" | "graphic" | "panels" | "grid" | "accent";

function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

/**
 * Feature wall. Local origin = centre of the base, backing at z=0, content faces +z.
 * Pure decoration (the "grid" variant shows decorative sneakers, which are not products).
 */
export function ExhibitionWall({ variant, width, height, palette }: { variant: WallVariant; width: number; height: number; palette: ZonePalette }) {
  const r = rng(width * 13 + height * 7 + variant.length);
  const mat = (c: string, rough = 0.7, extra?: object) => <meshStandardMaterial color={c} roughness={rough} {...extra} />;
  const back = (
    <mesh position={[0, height / 2, 0.06]} receiveShadow castShadow><boxGeometry args={[width, height, 0.12]} />
      {mat(variant === "graphic" ? "#18181b" : palette.wall, 0.8)}</mesh>
  );
  let content: React.ReactNode = null;
  if (variant === "marble") {
    const n = Math.max(2, Math.floor(width / 3.2)); const w = width / n;
    content = Array.from({ length: n }, (_, i) => {
      const x = -width / 2 + w * (i + 0.5);
      return (
        <group key={i} position={[x, height / 2, 0.14]}>
          <mesh><boxGeometry args={[w - 0.5, height - 0.5, 0.04]} />{mat("#2f5547", 0.35, { metalness: 0.1 })}</mesh>
          {[[0, (height - 0.5) / 2, w - 0.5, 0.06], [0, -(height - 0.5) / 2, w - 0.5, 0.06], [-(w - 0.5) / 2, 0, 0.06, height - 0.5], [(w - 0.5) / 2, 0, 0.06, height - 0.5]].map(([px, py, bw, bh], k) => (
            <mesh key={k} position={[px!, py!, 0.03]}><boxGeometry args={[bw!, bh!, 0.04]} />{mat(palette.trim, 0.25, { metalness: 0.9 })}</mesh>
          ))}
        </group>
      );
    });
  } else if (variant === "slats") {
    const n = Math.floor(width / 0.22);
    content = Array.from({ length: n }, (_, i) => (
      <mesh key={i} position={[-width / 2 + 0.11 + i * 0.22, height / 2, 0.16]} castShadow>
        <boxGeometry args={[0.14, height - 0.3, 0.1]} />{mat(i % 2 ? "#cdb08a" : "#bf9f76", 0.8)}</mesh>
    ));
  } else if (variant === "graphic") {
    const cols = [palette.accent, palette.accent2, "#f4f4f0", "#3b6cff"];
    content = Array.from({ length: 9 }, (_, i) => {
      const w = 1.2 + r() * 2.4, h = 0.8 + r() * 1.8;
      return (
        <mesh key={i} position={[-width / 2 + w / 2 + r() * (width - w), 0.6 + h / 2 + r() * (height - h - 1), 0.14]} rotation={[0, 0, (r() - 0.5) * 0.12]}>
          <boxGeometry args={[w, h, 0.03]} />{mat(cols[i % cols.length]!, 0.6, { emissive: cols[i % cols.length]!, emissiveIntensity: 0.15 })}</mesh>
      );
    });
  } else if (variant === "panels") {
    const n = Math.max(2, Math.floor(width / 2.4)); const w = width / n;
    content = Array.from({ length: n }, (_, i) => (
      <group key={i} position={[-width / 2 + w * (i + 0.5), 0, 0.13]}>
        <mesh position={[0, height * 0.42, 0]}><boxGeometry args={[w - 0.3, height * 0.7, 0.04]} />{mat("#273050", 0.5)}</mesh>
        <mesh position={[0, height * 0.42, 0.03]}><boxGeometry args={[w - 0.6, height * 0.62, 0.02]} />{mat("#202845", 0.5)}</mesh>
        <mesh position={[0, 0.5, 0.02]}><boxGeometry args={[w - 0.3, 0.9, 0.05]} />{mat(palette.trim, 0.4, { metalness: 0.6 })}</mesh>
      </group>
    ));
  } else if (variant === "accent") {
    content = (
      <group position={[0, height / 2, 0.14]}>
        <mesh><boxGeometry args={[width - 0.6, height - 0.6, 0.03]} />{mat(palette.accent, 0.5, { emissive: palette.accent, emissiveIntensity: 0.25 })}</mesh>
        {[-0.5, 0.5].map((f) => <mesh key={f} position={[0, f * (height - 1.4), 0.03]}><boxGeometry args={[width - 1.4, 0.08, 0.02]} />{mat("#ffffff", 0.4)}</mesh>)}
      </group>
    );
  } else {
    const cols = Math.floor(width / 1.1), rows = Math.floor((height - 0.4) / 0.8);
    const sc = ["#ffffff", "#d6ff3d", "#ff3d81", "#3b6cff", "#ff7a1a", "#1e1e1e"];
    content = (
      <group position={[0, 0.2, 0.15]}>
        {Array.from({ length: rows + 1 }, (_, j) => <mesh key={`h${j}`} position={[0, j * 0.8, 0]}><boxGeometry args={[width - 0.4, 0.04, 0.34]} />{mat("#0e0e10", 0.5)}</mesh>)}
        {Array.from({ length: cols + 1 }, (_, i) => <mesh key={`v${i}`} position={[-((cols * 1.1) / 2) + i * 1.1, (rows * 0.8) / 2, 0]}><boxGeometry args={[0.04, rows * 0.8, 0.34]} />{mat("#0e0e10", 0.5)}</mesh>)}
        {Array.from({ length: rows }, (_, j) => Array.from({ length: cols }, (_, i) => (
          r() > 0.25 ? (
            <group key={`${i}-${j}`} position={[-((cols * 1.1) / 2) + 0.55 + i * 1.1, j * 0.8 + 0.04, 0]} scale={2.1}>
              <AccessoryObject kind="sneaker" color={sc[(i * 3 + j * 5) % sc.length]!} />
            </group>
          ) : null
        )))}
      </group>
    );
  }
  return <group>{back}{content}</group>;
}
