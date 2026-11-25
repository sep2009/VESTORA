import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SandboxPay } from "@/components/commerce/SandboxPay";
import { getOrder, orderToken } from "@/server/commerce/orders";
import { activeProvider } from "@/server/payments";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Test payment", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ orderId: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ orderId }, { t }] = await Promise.all([params, searchParams]);
  const provider = activeProvider();
  const order = (await getOrder(orderId));
  if (!provider || provider.id !== "sandbox" || !order || t !== orderToken(order.id)) notFound();
  return <SandboxPay orderId={order.id} token={t!} amount={formatMoney({ amount: order.totals.total, currency: order.totals.currency })} paymentStatus={order.payment.status} />;
}
