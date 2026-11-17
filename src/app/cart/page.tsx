"use client";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/feedback/States";
import { Button } from "@/components/ui/Button";
import { CartLines, Totals } from "@/components/shop/CartLines";
import { useCart } from "@/stores/cart-store";
import { useMounted } from "@/lib/use-mounted";

export default function CartPage() {
  const lines = useCart((s) => s.lines);
  const mounted = useMounted();
  return (
    <PageShell eyebrow="Cart" title="Your cart" intro="One cart for the 3D mall and the shop. It is kept on this device.">
      {!mounted || lines.length === 0 ? (
        <EmptyState title="Your cart is empty" icon="bag" action={<div className="flex gap-3"><Button href="/shop" variant="secondary">Shop</Button><Button href="/" variant="secondary">Explore the mall</Button></div>}>Products you add in either mode appear here.</EmptyState>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
          <CartLines />
          <aside className="h-fit space-y-4 rounded-md border border-line bg-surface p-5" aria-label="Order summary">
            <h2 className="font-display text-xl">Summary</h2>
            <Totals lines={lines} />
            <Button href="/checkout" className="w-full">Continue to checkout</Button>
          </aside>
        </div>
      )}
    </PageShell>
  );
}
