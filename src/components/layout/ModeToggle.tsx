"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavMemory } from "@/stores/nav-memory";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/cn";

/** The two connected modes. Each link returns to where you last were in that mode (room/product, or filters/product). */
export function ModeToggle() {
  const path = usePathname();
  const mounted = useMounted();
  const { shopHref, exploreHref } = useNavMemory();
  const explore = path === "/";
  const item = (active: boolean) => cn("min-h-10 rounded-sm px-2.5 text-[11px] font-medium uppercase tracking-[0.1em] inline-flex items-center sm:px-3.5 sm:text-xs sm:tracking-[0.14em]", active ? "bg-ink text-paper" : "text-mute hover:text-ink");
  return (
    <nav aria-label="Mode" className="inline-flex rounded-md border border-line p-0.5">
      <Link href={mounted ? exploreHref : "/"} aria-current={explore ? "page" : undefined} className={item(explore)}>Explore</Link>
      <Link href={mounted ? shopHref : "/shop"} aria-current={!explore && ["/shop", "/product", "/brands", "/categories"].some((p) => path.startsWith(p)) ? "page" : undefined}
        className={item(!explore && ["/shop", "/product", "/brands", "/categories"].some((p) => path.startsWith(p)))}>Shop</Link>
    </nav>
  );
}
