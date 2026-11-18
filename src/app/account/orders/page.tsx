import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/feedback/States";
import { Button } from "@/components/ui/Button";
import { AccountNav } from "@/components/commerce/AccountNav";
import { orderStatusLabel, paymentStatusLabel } from "@/components/commerce/OrderSummary";
import { requireCustomer } from "@/server/commerce/page-auth";
import { ordersForUser } from "@/server/commerce/orders";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Your orders", robots: { index: false } };
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await requireCustomer("/account/orders");
  const orders = ordersForUser(u.id);
  return (
    <PageShell eyebrow="Account" title="Your orders"><AccountNav />
      {orders.length === 0 ? <EmptyState title="No orders yet" icon="box" action={<Button href="/shop" variant="secondary">Shop</Button>}>Orders you place while signed in appear here.</EmptyState> : (
        <ul className="divide-y divide-line border-y border-line">{orders.map((o) => (
          <li key={o.id}><Link href={`/account/orders/${o.id}`} className="grid gap-1 py-4 hover:bg-ink/4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
            <span><span className="font-mono text-sm">{o.id}</span><span className="block text-xs text-mute">{new Date(o.createdAt).toLocaleDateString("en-GB")} · {o.lines.reduce((n, l) => n + l.quantity, 0)} item(s){o.payment.test ? " · test order" : ""}</span></span>
            <span className="text-sm">{orderStatusLabel(o.status)} · payment {paymentStatusLabel(o.payment.status).toLowerCase()}</span>
            <span className="text-sm font-medium">{formatMoney({ amount: o.totals.total, currency: o.totals.currency })}</span></Link></li>))}</ul>
      )}
    </PageShell>
  );
}
