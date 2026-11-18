"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { announceAuthChange, post, useMe } from "@/components/commerce/auth-client";

/** Account menu: sign in / create account when signed out; account, orders and sign out when signed in. */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const me = useMe();
  const router = useRouter();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const item = "block w-full px-4 py-2 text-left text-sm hover:bg-ink/8";
  const signOut = async () => { await post("POST", "/api/auth/logout"); announceAuthChange(); setOpen(false); router.push("/"); router.refresh(); };
  return (
    <div ref={root} className="relative">
      <button type="button" aria-expanded={open} aria-haspopup="true" aria-label={me ? `Account menu, signed in as ${me.name}` : "Account menu"} onClick={() => setOpen((o) => !o)}
        className="relative grid size-11 place-items-center rounded-sm hover:bg-ink/8">
        <Icon name="user" />{me && <span aria-hidden="true" className="absolute right-2 bottom-2 size-2 rounded-full bg-ok" />}
      </button>
      {open && (
        <ul className="absolute right-0 top-full z-40 mt-2 w-52 rounded-md border border-line bg-surface py-2 shadow-pop">
          {me ? <li className="border-b border-line px-4 pb-2 text-xs text-mute">Signed in as<br /><span className="text-ink">{me.name}</span></li> : null}
          {me ? (
            <>
              <li><Link href="/account" onClick={() => setOpen(false)} className={item}>Account</Link></li>
              <li><Link href="/account/orders" onClick={() => setOpen(false)} className={item}>Orders</Link></li>
              <li><Link href="/favorites" onClick={() => setOpen(false)} className={item}>Favorites</Link></li>
              <li><button type="button" onClick={() => void signOut()} className={item}>Sign out</button></li>
            </>
          ) : (
            <>
              <li><Link href="/account" onClick={() => setOpen(false)} className={item}>Sign in or create account</Link></li>
              <li><Link href="/favorites" onClick={() => setOpen(false)} className={item}>Favorites</Link></li>
              <li><Link href="/cart" onClick={() => setOpen(false)} className={item}>Cart</Link></li>
            </>
          )}
        </ul>
      )}
    </div>
  );
}
