"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Stylist } from "./Stylist";

/** Full-page stylist. `?product=<id>` or `?department=<slug>` (from "Ask the stylist" links) tells it what you were looking at. */
export function AssistantPage() {
  const sp = useSearchParams();
  const page = useMemo(() => ({ productId: sp.get("product"), department: sp.get("department") }), [sp]);
  useEffect(() => { const q = sp.get("q"); if (q) setTimeout(() => window.dispatchEvent(new CustomEvent("vestora-stylist-ask", { detail: q })), 400); }, [sp]);
  return <div className="mx-auto max-w-3xl rounded-lg border border-line bg-paper p-4 sm:p-6"><Stylist variant="page" page={page} /></div>;
}
