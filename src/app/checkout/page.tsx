"use client";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/feedback/States";
import { Button } from "@/components/ui/Button";
import { CartLines, Totals } from "@/components/shop/CartLines";
import { useCart } from "@/stores/cart-store";
import { useMounted } from "@/lib/use-mounted";

/**
 * Honest checkout. Vestora does not take payment: no payment provider is configured, and the products it lists
 * come from other sellers. Real products link to the seller to buy; demo products cannot be bought at all.
 */
export default function CheckoutPage() {
  const lines = useCart((s) => s.lines);
  const mounted = useMounted();
  if (!mounted || lines.length === 0) {
    return <PageShell eyebrow="Checkout" title="Checkout"><EmptyState title="Nothing to check out" icon="bag" action={<Button href="/shop" variant="secondary">Shop</Button>}>Your cart is empty.</EmptyState></PageShell>;
  }
  const real = lines.filter((l) => l.source.kind !== "demo" && l.source.url);
  const demo = lines.filter((l) => l.source.kind === "demo");
  return (
    <PageShell eyebrow="Checkout" title="Review and buy" intro="Vestora does not process payments. Each real product is bought from its own seller; nothing is charged here.">
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <CartLines editable={false} />
        <aside className="h-fit space-y-5 rounded-md border border-line bg-surface p-5" aria-label="How to buy">
          <Totals lines={lines} />
          {real.length > 0 && (
            <section><h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-mute">Buy from the seller</h2>
              <ul className="space-y-2">{real.map((l) => (
                <li key={l.key}><a href={l.source.url!} target="_blank" rel="noopener noreferrer nofollow sponsored" className="block rounded-sm border border-ink px-4 py-3 text-sm hover:bg-ink hover:text-paper">
                  {l.name}{l.size ? ` (${l.size})` : ""} — buy at {l.source.retailer ?? "the seller"} ↗</a></li>
              ))}</ul>
              <p className="mt-2 text-xs text-mute">You choose size, color and quantity again on the seller&apos;s site, where you also pay.</p>
            </section>
          )}
          {demo.length > 0 && <p role="note" className="rounded-sm border border-line p-3 text-sm text-mute"><strong className="text-ink">{demo.length} demo item{demo.length === 1 ? "" : "s"}.</strong> Demo products are test data and cannot be purchased anywhere.</p>}
          <details className="text-sm text-mute"><summary className="cursor-pointer text-ink">Why is there no payment form?</summary>
            <p className="mt-2">On-site payment needs a payment provider (for example Stripe) configured with server-side keys, plus products Vestora itself sells. Neither exists yet, so this page never pretends an order was placed.</p></details>
        </aside>
      </div>
    </PageShell>
  );
}
