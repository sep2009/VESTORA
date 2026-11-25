import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { OrderActions } from "@/components/admin/OrderActions";
import { OrderSummary } from "@/components/commerce/OrderSummary";
import { can } from "@/server/auth/guard";
import { requireAdminPage } from "@/server/auth/page-guard";
import { getOrder } from "@/server/commerce/orders";

export const metadata: Metadata = { title: "Order", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireAdminPage();
  const o = (await getOrder((await params).id));
  if (!o) notFound();
  return (
    <AdminShell role={role} title={`Order ${o.id}`}>
      <p className="mb-6"><Link href="/admin/orders" className="text-xs uppercase tracking-[0.14em] underline">← All orders</Link></p>
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-8">
          {o.refundRequired && <p role="alert" className="rounded-sm border border-danger p-3 text-sm text-danger"><strong>Refund required.</strong> {o.payment.note ?? "This paid order was cancelled."} Refund it in the payment provider&apos;s dashboard; this system does not move money.</p>}
          {o.payment.note && !o.refundRequired && <p role="note" className="rounded-sm border border-line p-3 text-sm">{o.payment.note}</p>}
          <OrderSummary order={o} admin />
          <section><h2 className="mb-2 font-display text-xl">History</h2><ol className="space-y-1 text-sm">{o.history.map((h, i) => <li key={i}><span className="text-mute">{new Date(h.at).toLocaleString("en-GB")}</span> · {h.event}</li>)}</ol></section>
          {o.notes.length > 0 && <section><h2 className="mb-2 font-display text-xl">Notes</h2><ul className="space-y-1 text-sm">{o.notes.map((n, i) => <li key={i}><span className="text-mute">{new Date(n.at).toLocaleString("en-GB")} · {n.by}</span> — {n.text}</li>)}</ul></section>}
        </div>
        <OrderActions id={o.id} status={o.status} paymentStatus={o.payment.status} tracking={o.tracking ?? ""} canDelete={can(role, "orders.delete") && !(o.payment.status === "paid" && !o.payment.test)} canWrite={can(role, "orders.write")} />
      </div>
    </AdminShell>
  );
}
