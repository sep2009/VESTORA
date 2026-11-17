"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { accountLinks } from "./nav-links";

/** Navigation menu only; sign-in/out is added with authentication in the next stage. */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={root} className="relative">
      <button type="button" aria-expanded={open} aria-haspopup="true" aria-label="Account menu" onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-sm hover:bg-ink/8">
        <Icon name="user" />
      </button>
      {open && (
        <ul className="absolute right-0 top-full z-40 mt-2 w-48 rounded-md border border-line bg-surface py-2 shadow-pop">
          {accountLinks.map((l) => (
            <li key={l.href}><Link href={l.href} onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-ink/8">{l.label}</Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
