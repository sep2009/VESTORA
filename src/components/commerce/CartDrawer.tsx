"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/States";
import { Icon } from "@/components/ui/Icon";
import { useCartDrawer } from "@/stores/cart-drawer";
import { useMounted } from "@/lib/use-mounted";
import { useCartCheck } from "./cart-check";
import { CartLinesView, CheckStatus, SummaryView } from "./CartView";

/** Slide-in cart available from every page (the header bag button). Esc, the close button or a click outside closes it. */
export function CartDrawer() {
  const open = useCartDrawer((s) => s.open);
  const set = useCartDrawer((s) => s.set);
  const mounted = useMounted();
  const path = usePathname();
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<Element | null>(null);
  useEffect(() => { set(false); }, [path, set]);
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    panel.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); set(false); }
      if (e.key === "Tab" && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),select,input")].filter((x) => x.offsetParent !== null);
        const first = f[0], last = f[f.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", key, true);
    return () => { window.removeEventListener("keydown", key, true); (opener.current as HTMLElement | null)?.focus?.(); };
  }, [open, set]);
  if (!mounted || !open) return null;
  return <DrawerBody panelRef={panel} close={() => set(false)} />;
}

function DrawerBody({ panelRef, close }: { panelRef: React.RefObject<HTMLElement | null>; close: () => void }) {
  const { lines, data, loading, error, retry } = useCartCheck();
  const blocked = !!data && (data.lines.some((l) => !l.ok) || !data.totals);
  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button type="button" aria-label="Close cart" tabIndex={-1} onClick={close} className="absolute inset-0 bg-ink/50" />
      <aside ref={panelRef} tabIndex={-1} className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-paper shadow-pop outline-none">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-display text-xl">Your cart</h2>
          <button type="button" onClick={close} aria-label="Close cart" className="grid size-11 place-items-center rounded-sm hover:bg-ink/8"><Icon name="close" size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
          {lines.length === 0 ? (
            <div className="py-10"><EmptyState title="Your cart is empty" icon="bag" action={<div className="flex gap-3"><Button href="/shop" variant="secondary" onClick={close}>Shop</Button><Button href="/" variant="secondary" onClick={close}>Explore the mall</Button></div>}>Products you add in the mall or the shop appear here.</EmptyState></div>
          ) : (
            <>
              <CheckStatus loading={loading} error={error} retry={retry} />
              <CartLinesView lines={lines} check={data} editable compact />
            </>
          )}
        </div>
        {lines.length > 0 && (
          <div className="space-y-3 border-t border-line px-5 py-4">
            <SummaryView check={data} />
            {blocked && <p className="text-xs text-danger">Some items need attention before checkout.</p>}
            <div className="grid grid-cols-2 gap-2"><Button href="/cart" variant="secondary" onClick={close}>View cart</Button><Button href="/checkout" onClick={close} disabled={blocked || loading}>Checkout</Button></div>
          </div>
        )}
      </aside>
    </div>
  );
}
