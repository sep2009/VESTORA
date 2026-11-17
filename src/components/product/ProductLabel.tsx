import { cn } from "@/lib/cn";

const tone = { ink: "bg-ink text-paper", accent: "bg-accent text-ink", line: "border border-line text-mute" } as const;

export function Label({ children, kind = "line" }: { children: string; kind?: keyof typeof tone }) {
  return <span className={cn("inline-block rounded-sm px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em]", tone[kind])}>{children}</span>;
}

/** Availability comes only from the record. "unknown" is shown as such, never guessed. */
export function AvailabilityLabel({ availability }: { availability: "in_stock" | "out_of_stock" | "unknown" }) {
  if (availability === "out_of_stock") return <Label kind="ink">Sold out</Label>;
  if (availability === "unknown") return <Label>Availability unconfirmed</Label>;
  return null;
}
