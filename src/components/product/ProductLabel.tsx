import { cn } from "@/lib/cn";
import type { StockLevel } from "@/lib/product-info";

const tone = { ink: "bg-ink text-paper", accent: "bg-accent text-ink", line: "border border-line text-mute" } as const;

export function Label({ children, kind = "line" }: { children: string; kind?: keyof typeof tone }) {
  return <span className={cn("inline-block rounded-sm px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em]", tone[kind])}>{children}</span>;
}

/** Labels are derived from real inventory, never hand-picked per product. */
export function StockLabel({ level }: { level: StockLevel }) {
  if (level === "out") return <Label kind="ink">Sold out</Label>;
  if (level === "low") return <Label kind="accent">Low stock</Label>;
  return null;
}
