"use client";
import { useShowroom } from "@/stores/showroom-store";
import { cn } from "@/lib/cn";

/** Floor-plan style department picker. Selection is stored in the showroom store; camera moves arrive with the showroom stage. */
export function Minimap({ departments }: { departments: { slug: string; name: string }[] }) {
  const active = useShowroom((s) => s.activeDepartmentSlug);
  const setDepartment = useShowroom((s) => s.setDepartment);
  return (
    <nav aria-label="Showroom map" className="rounded-md border border-line bg-surface/90 p-3 backdrop-blur">
      <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-mute">Map</p>
      {departments.length === 0 ? (
        <p className="max-w-40 text-xs text-mute">Departments appear here once the catalog is connected.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-1.5">
          {departments.map((d) => (
            <li key={d.slug}>
              <button type="button" aria-pressed={active === d.slug} onClick={() => setDepartment(active === d.slug ? null : d.slug)}
                className={cn("w-full rounded-sm border px-2 py-1.5 text-left text-xs", active === d.slug ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}>
                {d.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
