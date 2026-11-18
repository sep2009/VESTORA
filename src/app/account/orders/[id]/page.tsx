import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { AccountNav } from "@/components/commerce/AccountNav";
import { OrderSummary } from "@/components/commerce/OrderSummary";
import { requireCustomer } from "@/server/commerce/page-auth";
import { customerView, getOrder, orderToken } from "@/server/commerce/orders";

export const metadata: Metadata = { title: "Order", robots: { index: false } };
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireCustomer(`/account/orders/${id}`);
  const o = getOrder(id);
  if (!o || o.userId !== u.id) notFound();
  return (
    <PageShell eyebrow="Account" title={`Order ${o.id}`}><AccountNav />
      <div className="space-y-6">
        {o.payment.status === "pending" && <Button href={`/checkout/confirmation/${o.id}?t=${orderToken(o.id)}`}>Check payment status</Button>}
        <OrderSummary order={customerView(o) as typeof o} />
      </div>
    </PageShell>
  );
}
