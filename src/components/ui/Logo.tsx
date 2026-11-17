import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Vestora — home" className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-display text-xl tracking-[0.32em] uppercase">Vestora</span>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
    </Link>
  );
}
