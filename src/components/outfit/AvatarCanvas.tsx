"use client";
import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";
import type { AvatarProps } from "./avatar3d/adapter";
import type { StageApi } from "./avatar3d/Stage";

const Stage = dynamic(() => import("./avatar3d/Stage"), { ssr: false, loading: () => <Loading /> });
const Loading = () => <div className="grid h-full place-items-center text-sm text-mute" role="status">Loading 3D preview…</div>;

class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function webglOk(): boolean { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }

/** Lazy 3D stage. If WebGL is unavailable or the stage crashes, the outfit still works as a list (see fallback text). */
export function AvatarCanvas(props: AvatarProps & { apiRef: React.MutableRefObject<StageApi | null>; spin: boolean }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => setOk(webglOk()), []);
  const fallback = <div className="grid h-full place-items-center p-6 text-center text-sm text-mute" role="alert">The 3D preview is not available in this browser (WebGL is off or unsupported). Your outfit is still saved and listed on the right, and you can still add it to your cart.</div>;
  if (ok === null) return <Loading />;
  if (!ok) return fallback;
  return <Boundary fallback={fallback}><Stage {...props} /></Boundary>;
}
