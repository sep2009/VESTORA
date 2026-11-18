"use client";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/feedback/States";
import { Button } from "@/components/ui/Button";
import { useCartCheck } from "@/components/commerce/cart-check";
import { CartLinesView, CheckStatus, SummaryView } from "@/components/commerce/CartView";
import { useMounted } from "@/lib/use-mounted";

export default function CartPage() {
  const mounted = useMounted();
  const { lines, data, loading, error, retry } = useCartCheck();
  const problems = data ? data.lines.filter((l) => !l.ok).length : 0;
  const blocked = problems > 0 || (!!data && !data.totals);
  return (
    <PageShell eyebrow="Cart" title="Your cart" intro="One cart for the 3D mall and the shop. It is kept on this device, and stock and prices are checked against the catalog.">
      {!mounted || lines.length === 0 ? (
        <EmptyState title="Your cart is empty" icon="bag" action={<div className="flex gap-3"><Button href="/shop" variant="secondary">Shop</Button><Button href="/" variant="secondary">Explore the mall</Button></div>}>Products you add in either mode appear here.</EmptyState>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-4">
            <CheckStatus loading={loading} error={error} retry={retry} />
            <CartLinesView lines={lines} check={data} editable />
          </div>
          <aside className="h-fit space-y-4 rounded-md border border-line bg-surface p-5" aria-label="Order summary">
            <h2 className="font-display text-xl">Summary</h2>
            <SummaryView check={data} />
            {data?.payments?.test && <p role="note" className="rounded-sm border border-line p-3 text-xs text-mute"><strong className="text-ink">Test payments.</strong> Checkout uses a test payment provider: no real money moves.</p>}
            {problems > 0 && <p role="alert" className="text-sm text-danger">{problems} item{problems === 1 ? " needs" : "s need"} attention. Fix or remove {problems === 1 ? "it" : "them"} to continue.</p>}
            <Button href="/checkout" className="w-full" disabled={blocked || loading}>Continue to checkout</Button>
          </aside>
        </div>
      )}
    </PageShell>
  );
}
