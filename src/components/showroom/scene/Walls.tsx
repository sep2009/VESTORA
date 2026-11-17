import { CUTAWAY_HEIGHT, DOOR_WIDTH, WALL_HEIGHT, WALL_THICKNESS, ZONE_SIZE, type Openings } from "@/modules/showroom/layout";
import type { ZonePalette } from "@/modules/showroom/types";

const HALF = ZONE_SIZE / 2;
const T = WALL_THICKNESS;
const DOOR_TOP = 3.6;

type WallProps = { length: number; height: number; color: string; trim: string; open: boolean; tall: boolean };

/** One wall along local X (rotate the group for other sides). Open walls leave a doorway with a lintel when tall. */
function Wall({ length, height, color, trim, open, tall }: WallProps) {
  const mat = <meshStandardMaterial color={color} roughness={0.8} />;
  const seg = (len: number, x: number) => (
    <mesh key={x} position={[x, height / 2, 0]} castShadow receiveShadow><boxGeometry args={[len, height, T]} />{mat}</mesh>
  );
  const parts = open
    ? [seg((length - DOOR_WIDTH) / 2, -(DOOR_WIDTH / 2 + (length - DOOR_WIDTH) / 4)), seg((length - DOOR_WIDTH) / 2, DOOR_WIDTH / 2 + (length - DOOR_WIDTH) / 4)]
    : [seg(length, 0)];
  return (
    <group>
      {parts}
      {open && tall && <mesh position={[0, (DOOR_TOP + height) / 2, 0]} castShadow receiveShadow><boxGeometry args={[DOOR_WIDTH, height - DOOR_TOP, T]} />{mat}</mesh>}
      {!tall && <mesh position={[0, height + 0.03, 0]}><boxGeometry args={[length, 0.06, T + 0.06]} /><meshStandardMaterial color={trim} roughness={0.5} /></mesh>}
    </group>
  );
}

/** Four walls of a zone. North and west are full height; south and east are cut low so the camera sees in. */
export function Walls({ palette, open }: { palette: ZonePalette; open: Openings }) {
  const common = { length: ZONE_SIZE, color: palette.wall, trim: palette.trim };
  return (
    <group>
      <group position={[0, 0, -(HALF - T / 2)]}><Wall {...common} height={WALL_HEIGHT} open={open.n} tall /></group>
      <group position={[-(HALF - T / 2), 0, 0]} rotation={[0, Math.PI / 2, 0]}><Wall {...common} height={WALL_HEIGHT} open={open.w} tall /></group>
      <group position={[0, 0, HALF - T / 2]}><Wall {...common} height={CUTAWAY_HEIGHT} open={open.s} tall={false} /></group>
      <group position={[HALF - T / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}><Wall {...common} height={CUTAWAY_HEIGHT} open={open.e} tall={false} /></group>
      {/* baseboards and cove light along the two full-height walls */}
      <mesh position={[0, 0.09, -(HALF - T - 0.03)]}><boxGeometry args={[ZONE_SIZE - 2 * T, 0.18, 0.06]} /><meshStandardMaterial color={palette.trim} roughness={0.5} /></mesh>
      <mesh position={[-(HALF - T - 0.03), 0.09, 0]}><boxGeometry args={[0.06, 0.18, ZONE_SIZE - 2 * T]} /><meshStandardMaterial color={palette.trim} roughness={0.5} /></mesh>
      <mesh position={[0, WALL_HEIGHT - 0.25, -(HALF - T - 0.06)]}><boxGeometry args={[ZONE_SIZE - 2 * T, 0.08, 0.12]} /><meshStandardMaterial color={palette.light} emissive={palette.light} emissiveIntensity={1.4} /></mesh>
      <mesh position={[-(HALF - T - 0.06), WALL_HEIGHT - 0.25, 0]}><boxGeometry args={[0.12, 0.08, ZONE_SIZE - 2 * T]} /><meshStandardMaterial color={palette.light} emissive={palette.light} emissiveIntensity={1.4} /></mesh>
    </group>
  );
}
