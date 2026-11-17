import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-10", className)}>{children}</div>;
}

/** Shared editorial page header: eyebrow, large serif title, intro. Every route uses this. */
export function PageShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children?: ReactNode }) {
  return (
    <Container className="py-10 sm:py-16">
      <header className="mb-10 max-w-3xl border-b border-line pb-8">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-accent-ink">{eyebrow}</p>
        <h1 className="font-display text-headline">{title}</h1>
        {intro && <p className="mt-4 max-w-xl leading-relaxed text-mute">{intro}</p>}
      </header>
      {children}
    </Container>
  );
}
