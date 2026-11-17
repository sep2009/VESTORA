"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Drawer } from "@/components/ui/Dialog";
import { accountLinks, primaryLinks } from "./nav-links";
import { DEPARTMENT_ZONES } from "@/modules/showroom/layout";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const item = "block border-b border-line py-3 text-lg font-display";
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="grid size-11 place-items-center rounded-sm hover:bg-ink/8 lg:hidden">
        <Icon name="menu" />
      </button>
      <Drawer open={open} onClose={close} label="Menu" side="left">
        <nav aria-label="Mobile">
          <p className="mt-2 mb-1 text-xs uppercase tracking-[0.2em] text-mute">Departments</p>
          {DEPARTMENT_ZONES.map((d) => <Link key={d.id} href={`/shop?dept=${d.department}`} onClick={close} className={item}>{d.name}</Link>)}
          <p className="mt-6 mb-1 text-xs uppercase tracking-[0.2em] text-mute">Browse</p>
          {primaryLinks.map((l) => <Link key={l.href} href={l.href} onClick={close} className={item}>{l.label}</Link>)}
          <p className="mt-6 mb-1 text-xs uppercase tracking-[0.2em] text-mute">You</p>
          {accountLinks.map((l) => <Link key={l.href} href={l.href} onClick={close} className={item}>{l.label}</Link>)}
        </nav>
      </Drawer>
    </>
  );
}
