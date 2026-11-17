"use client";
import { DepartmentSign } from "./DepartmentSign";

/** Corridor wayfinding plate, e.g. "← Luxury | New Arrivals →". */
export function DirectionalSign({ left, right, position, rotationY = 0 }: { left: string; right: string; position: readonly [number, number, number]; rotationY?: number }) {
  return (
    <DepartmentSign title={`← ${left}  ·  ${right} →`} style={{ bg: "#16161a", fg: "#f5f3ef", sub: "#bbb" }} accent="#ff5a1f"
      width={4} height={0.8} position={position} rotationY={rotationY} />
  );
}
