"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEPARTMENT_ZONES } from "@/modules/showroom/layout";
import { cameraManager } from "@/modules/showroom/camera/manager";
import { Container } from "./PageShell";

/** Quick jump to any department. In the mall it flies the camera there; in the shop it filters to that department. */
export function DepartmentStrip() {
  const path = usePathname();
  const inMall = path === "/";
  return (
    <nav aria-label="Departments" className="border-t border-line">
      <Container>
        <ul className="flex gap-5 overflow-x-auto py-2 text-[11px] uppercase tracking-[0.16em]">
          {DEPARTMENT_ZONES.map((z) => (
            <li key={z.id} className="shrink-0">
              <Link href={inMall ? `/?dept=${z.department}` : `/shop?dept=${z.department}`}
                onClick={(e) => { if (inMall) { e.preventDefault(); cameraManager.setMode("explore"); cameraManager.focusZone(z.id); } }}
                className="inline-flex min-h-9 items-center text-mute hover:text-ink">{z.name}</Link>
            </li>
          ))}
        </ul>
      </Container>
    </nav>
  );
}
