"use client";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/feedback/States";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/stores/cart-store";
import { useMounted } from "@/lib/use-mounted";

export default function CartPage() {
  const lines = useCart((s) => s.lines);
  const mounted = useMounted();
  return (
    <PageShell eyebrow="Cart" title="Your bag">
      {!mounted || lines.length === 0 ? (
        <EmptyState title="Your bag is empty" icon="bag" action={<Button href="/shop" variant="secondary">Browse the shop</Button>}>Pieces you add will appear here.</EmptyState>
      ) : (
        <p className="text-mute">{lines.length} line(s) saved. Pricing and line details are added with checkout.</p>
      )}
    </PageShell>
  );
}
