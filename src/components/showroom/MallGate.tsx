"use client";
import { useEffect, useState } from "react";
import Showroom from "./Showroom";
import { Button } from "@/components/ui/Button";
import type { ResolvedDisplay } from "@/modules/showroom/types";

/**
 * Phones are shop-first: the 3D mall (the heaviest part) only loads when asked for, or when a deep link points at it
 * (/?p=… or /?dept=…). Larger screens load it straight away.
 */
export function MallGate({ displays, departments }: { displays: ResolvedDisplay[]; departments: { slug: string; name: string; tagline: string }[] }) {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setOpen(window.innerWidth >= 768 || sp.has("p") || sp.has("dept"));
  }, []);
  if (open === null) return <div className="h-[28rem]" aria-hidden="true" />;
  if (!open) {
    return (
      <section className="rounded-lg border border-line bg-surface p-6 text-center" aria-label="3D mall">
        <h2 className="font-display text-2xl">Explore the 3D mall</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-mute">Optional. Everything in the mall is also in the shop, so you never have to walk around to buy something.</p>
        <Button className="mt-5" size="lg" onClick={() => setOpen(true)}>Open the mall (lite)</Button>
      </section>
    );
  }
  return <Showroom displays={displays} departments={departments} />;
}
