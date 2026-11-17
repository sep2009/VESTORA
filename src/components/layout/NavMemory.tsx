"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCameraStore } from "@/stores/camera-store";
import { useNavMemory } from "@/stores/nav-memory";

const isShop = (p: string) => p.startsWith("/shop") || p.startsWith("/product") || p.startsWith("/brands") || p.startsWith("/categories");

/** Records the last shop page (with its filters) and the last mall focus (room or product) for the mode switch. Renders nothing. */
export function NavMemory({ productSlugs }: { productSlugs: Record<string, string> }) {
  const path = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => { if (isShop(path)) useNavMemory.getState().setShop(search ? `${path}?${search}` : path); }, [path, search]);
  useEffect(() => useCameraStore.subscribe((s, prev) => {
    // The mall resets its focus when it unmounts; only record changes made while the mall page is showing.
    if (s.focus === prev.focus || window.location.pathname !== "/") return;
    const f = s.focus;
    const href = f?.kind === "product" ? `/?p=${productSlugs[f.productId] ?? ""}` : f?.kind === "zone" ? `/?dept=${f.zoneId}` : "/";
    useNavMemory.getState().setExplore(href);
  }), [productSlugs]);
  return null;
}
