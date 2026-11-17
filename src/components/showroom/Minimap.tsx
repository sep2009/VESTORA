"use client";
import { useState } from "react";
import { DEPARTMENT_ZONES } from "@/modules/showroom/layout";
import { useShowroom } from "@/stores/showroom-store";
import { cn } from "@/lib/cn";

/**
 * Floor-plan picker for the seven departments. Choosing one flies the camera there;
 * "Overview" returns to the full mall. Collapsible on small screens so it never hides the scene.
 */
export function Minimap() {
  const active = useShowroom((s) => s.activeDepartmentSlug);
  const setDepartment = useShowroom((s) => s.setDepartment);
  const [open, setOpen] = useState(false);
  const pick = (slug: string | null) => { setDepartment(slug); setOpen(false); };
  return (
    <nav aria-label="Showroom map" className="rounded-md border border-line bg-surface/92 p-3 shadow-card backdrop-blur">
      <div className="flex items-center justify-between gap-6">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="showroom-map-list"
          className="text-[11px] uppercase tracking-[0.2em] text-mute sm:pointer-events-none">
          Map<span className="sm:hidden"> {open ? "▴" : "▾"}</span>
        </button>
        <button type="button" onClick={() => pick(null)} aria-pressed={active === null}
          className={cn("rounded-sm px-2 py-0.5 text-[11px] uppercase tracking-[0.14em]", active === null ? "bg-ink text-paper" : "text-mute hover:text-ink")}>Overview</button>
      </div>
      <ul id="showroom-map-list" className={cn("mt-2 grid-cols-2 gap-1.5 sm:grid sm:grid-cols-1 sm:gap-1", open ? "grid" : "hidden")}>
        {DEPARTMENT_ZONES.map((z) => (
          <li key={z.id}>
            <button type="button" aria-pressed={active === z.department} onClick={() => pick(active === z.department ? null : z.department)}
              className={cn("flex w-full items-center gap-2 rounded-sm border px-2 py-1.5 text-left text-xs", active === z.department ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}>
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full border border-black/20" style={{ background: z.palette.accent }} />{z.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
