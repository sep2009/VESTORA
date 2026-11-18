"use client";
import { Component, useEffect, useState, type ReactNode } from "react";
import { MallFallback } from "./MallFallback";
import Showroom from "./Showroom";
import { Button } from "@/components/ui/Button";
import type { ResolvedDisplay } from "@/modules/showroom/types";

/**
 * Phones are shop-first: the 3D mall (the heaviest part) only loads when asked for, or when a deep link points at it
 * (/?p=… or /?dept=…). Larger screens load it straight away.
 */
function webglOk(): boolean { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }

/** A crash anywhere in the 3D scene must not take the page down: show the 2D departments instead. */
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.error("[mall] 3D scene failed", e); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function MallGate({ displays, departments }: { displays: ResolvedDisplay[]; departments: { slug: string; name: string; tagline: string }[] }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const [gl, setGl] = useState(true);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setGl(webglOk());
    setOpen(window.innerWidth >= 768 || sp.has("p") || sp.has("dept"));
  }, []);
  if (open === null) return <div className="h-[28rem]" aria-hidden="true" />;
  if (!gl) return <MallFallback departments={departments} reason="Your browser cannot show the 3D mall (WebGL is off or unsupported)." />;
  if (!open) {
    return (
      <section className="rounded-lg border border-line bg-surface p-6 text-center" aria-label="3D mall">
        <h2 className="font-display text-2xl">Explore the 3D mall</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-mute">Optional. Everything in the mall is also in the shop, so you never have to walk around to buy something.</p>
        <Button className="mt-5" size="lg" onClick={() => setOpen(true)}>Open the mall (lite)</Button>
      </section>
    );
  }
  return <SceneBoundary fallback={<MallFallback departments={departments} reason="The 3D mall could not start on this device." />}><Showroom displays={displays} departments={departments} /></SceneBoundary>;
}
