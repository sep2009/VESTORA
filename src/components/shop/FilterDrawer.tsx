"use client";
import { useState, type ReactNode } from "react";

/** Filters are always visible on large screens and sit behind a button on small ones. */
export function FilterDrawer({ children, activeCount }: { children: ReactNode; activeCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" aria-expanded={open} aria-controls="shop-filters" onClick={() => setOpen((o) => !o)}
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-sm border border-ink px-4 text-xs font-medium uppercase tracking-[0.14em] lg:hidden">
        Filters{activeCount > 0 ? ` (${activeCount})` : ""} {open ? "▴" : "▾"}
      </button>
      <div id="shop-filters" className={open ? "block" : "hidden lg:block"}>{children}</div>
    </div>
  );
}
