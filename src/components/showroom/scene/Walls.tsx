import { CUTAWAY_HEIGHT, DOOR_WIDTH, WALL_HEIGHT, WALL_THICKNESS, ZONE_SIZE, type Openings } from "@/modules/showroom/layout";
import type { ZonePalette } from "@/modules/showroom/types";
import { blackSteel, brass, floor, lightStrip, paint, wall } from "./pbr/materials";

const HALF = ZONE_SIZE / 2;
const T = WALL_THICKNESS;
const DOOR_TOP = 3.6;

type WallProps = { length: number; height: number; color: string; trim: string; open: boolean; tall: boolean };

/** One wall along local X: plastered body, doorway with a lintel and a metal architrave, cut low with a stone coping when not tall. */
function Wall({ length, height, color, trim, open, tall }: WallProps) {
  const mat = wall(color, length, height);
  const seg = (len: number, x: number) => (
    <mesh key={x} position={[x, height / 2, 0]} castShadow receiveShadow material={mat}><boxGeometry args={[len, height, T]} /></mesh>
  );
  const side = (length - DOOR_WIDTH) / 2;
  const parts = open ? [seg(side, -(DOOR_WIDTH / 2 + side / 2)), seg(side, DOOR_WIDTH / 2 + side / 2)] : [seg(length, 0)];
  const frame = paint(trim, 0.4);
  return (
    <group>
      {parts}
      {open && tall && <mesh position={[0, (DOOR_TOP + height) / 2, 0]} castShadow receiveShadow material={mat}><boxGeometry args={[DOOR_WIDTH, height - DOOR_TOP, T]} /></mesh>}
      {open && tall && (
        <>
          {[-1, 1].map((s) => <mesh key={s} position={[s * (DOOR_WIDTH / 2 + 0.025), DOOR_TOP / 2, 0]} castShadow material={frame}><boxGeometry args={[0.05, DOOR_TOP, T + 0.04]} /></mesh>)}
          <mesh position={[0, DOOR_TOP + 0.025, 0]} castShadow material={frame}><boxGeometry args={[DOOR_WIDTH + 0.1, 0.05, T + 0.04]} /></mesh>
        </>
      )}
      {!tall && <mesh position={[0, height + 0.02, 0]} castShadow receiveShadow material={floor("limestone", "#d6d1c6", 1, 1)}><boxGeometry args={[length, 0.04, T + 0.06]} /></mesh>}
    </group>
  );
}

/** Slim track with spot heads, mounted off the full-height wall at ceiling level. */
function Track({ length, axis }: { length: number; axis: "x" | "z" }) {
  const heads = [-0.36, -0.12, 0.12, 0.36].map((k) => k * length);
  return (
    <group rotation={[0, axis === "z" ? Math.PI / 2 : 0, 0]}>
      <mesh position={[0, 0, 0]} castShadow material={blackSteel()}><boxGeometry args={[length * 0.9, 0.035, 0.05]} /></mesh>
      {heads.map((x) => (
        <group key={x} position={[x, -0.03, 0.05]} rotation={[0.6, 0, 0]}>
          <mesh position={[0, -0.07, 0]} castShadow material={blackSteel()}><cylinderGeometry args={[0.035, 0.045, 0.14, 14]} /></mesh>
          <mesh position={[0, -0.145, 0]} material={lightStrip("#fff0d8", 0.9)}><circleGeometry args={[0.035, 14]} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** Four walls of a zone. North and west are full height; south and east are cut low so the camera sees in. */
export function Walls({ palette, open }: { palette: ZonePalette; open: Openings }) {
  const common = { length: ZONE_SIZE, color: palette.wall, trim: palette.trim };
  const skirt = paint(palette.trim === "#17171a" ? "#0f0f10" : palette.trim, 0.5);
  const inner = ZONE_SIZE - 2 * T;
  return (
    <group>
      <group position={[0, 0, -(HALF - T / 2)]}><Wall {...common} height={WALL_HEIGHT} open={open.n} tall /></group>
      <group position={[-(HALF - T / 2), 0, 0]} rotation={[0, Math.PI / 2, 0]}><Wall {...common} height={WALL_HEIGHT} open={open.w} tall /></group>
      <group position={[0, 0, HALF - T / 2]}><Wall {...common} height={CUTAWAY_HEIGHT} open={open.s} tall={false} /></group>
      <group position={[HALF - T / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}><Wall {...common} height={CUTAWAY_HEIGHT} open={open.e} tall={false} /></group>
      {/* skirting boards */}
      <mesh position={[0, 0.07, -(HALF - T - 0.012)]} castShadow material={skirt}><boxGeometry args={[inner, 0.14, 0.024]} /></mesh>
      <mesh position={[-(HALF - T - 0.012), 0.07, 0]} castShadow material={skirt}><boxGeometry args={[0.024, 0.14, inner]} /></mesh>
      {/* cornice with a concealed warm LED slot beneath it */}
      <mesh position={[0, WALL_HEIGHT - 0.1, -(HALF - T - 0.05)]} castShadow material={wall(palette.wall, inner, 0.2)}><boxGeometry args={[inner, 0.2, 0.1]} /></mesh>
      <mesh position={[-(HALF - T - 0.05), WALL_HEIGHT - 0.1, 0]} castShadow material={wall(palette.wall, 0.2, inner)}><boxGeometry args={[0.1, 0.2, inner]} /></mesh>
      <mesh position={[0, WALL_HEIGHT - 0.215, -(HALF - T - 0.05)]} material={lightStrip(palette.light, 1.0)}><boxGeometry args={[inner, 0.02, 0.07]} /></mesh>
      <mesh position={[-(HALF - T - 0.05), WALL_HEIGHT - 0.215, 0]} material={lightStrip(palette.light, 1.0)}><boxGeometry args={[0.07, 0.02, inner]} /></mesh>
      <group position={[0, WALL_HEIGHT - 0.55, -(HALF - T - 0.7)]}><Track length={11} axis="x" /></group>
      <group position={[-(HALF - T - 0.7), WALL_HEIGHT - 0.55, 0]}><Track length={11} axis="z" /></group>
    </group>
  );
}

export { brass };
