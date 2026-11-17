import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Vestora — home" className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-display text-sm tracking-[0.18em] uppercase sm:text-xl sm:tracking-[0.32em]">Vestora</span>
      <span aria-hidden="true" className="hidden size-1.5 rounded-full bg-accent sm:block" />
    </Link>
  );
}
