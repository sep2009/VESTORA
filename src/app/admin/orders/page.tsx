import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { orderStatusLabel, paymentStatusLabel } from "@/components/commerce/OrderSummary";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/modules/commerce/types";
import { requireAdminPage } from "@/server/auth/page-guard";
import { searchOrders } from "@/server/commerce/orders";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; payment?: string; page?: string }> }) {
  const { role } = await requireAdminPage();
  const sp = await searchParams;
  const r = (await searchOrders({ q: sp.q, status: sp.status || undefined, payment: sp.payment || undefined, page: Number(sp.page) || 1 }));
  const pages = Math.max(1, Math.ceil(r.total / r.pageSize));
  const href = (n: number) => `/admin/orders?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.status ? { status: sp.status } : {}), ...(sp.payment ? { payment: sp.payment } : {}), page: String(n) })}`;
  const sel = "h-10 rounded-sm border border-line bg-surface px-2 text-sm";
  return (
    <AdminShell role={role} title="Orders" intro={`${r.total} order${r.total === 1 ? "" : "s"}`}>
      <form method="get" role="search" className="mb-6 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="oq">Search orders</label><input id="oq" name="q" defaultValue={sp.q ?? ""} placeholder="Order id, email, name, SKU" className="h-10 w-64 rounded-sm border border-line bg-surface px-3 text-sm" />
        <label className="sr-only" htmlFor="os">Order status</label><select id="os" name="status" defaultValue={sp.status ?? ""} className={sel}><option value="">Any status</option>{ORDER_STATUSES.map((s) => <option key={s} value={s}>{orderStatusLabel(s)}</option>)}</select>
        <label className="sr-only" htmlFor="op">Payment status</label><select id="op" name="payment" defaultValue={sp.payment ?? ""} className={sel}><option value="">Any payment</option>{PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{paymentStatusLabel(s)}</option>)}</select>
        <Button type="submit" size="sm">Filter</Button>
      </form>
      {r.orders.length === 0 ? <p className="text-sm text-mute">No orders match.</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-[0.14em] text-mute"><tr><th className="py-2 pr-4">Order</th><th className="pr-4">Customer</th><th className="pr-4">Total</th><th className="pr-4">Payment</th><th className="pr-4">Status</th><th>Placed</th></tr></thead>
          <tbody>{r.orders.map((o) => (
            <tr key={o.id} className="border-t border-line align-top">
              <td className="py-3 pr-4"><Link href={`/admin/orders/${o.id}`} className="font-mono underline">{o.id}</Link></td>
              <td className="pr-4">{o.customer.name}<span className="block text-xs text-mute">{o.customer.email}</span></td>
              <td className="pr-4">{formatMoney({ amount: o.totals.total, currency: o.totals.currency })}</td>
              <td className="pr-4">{paymentStatusLabel(o.payment.status)}{o.payment.test && <span className="block text-xs text-mute">test</span>}{o.refundRequired && <span className="block text-xs text-danger">refund required</span>}</td>
              <td className="pr-4">{orderStatusLabel(o.status)}</td>
              <td className="whitespace-nowrap text-mute">{new Date(o.createdAt).toLocaleString("en-GB")}</td>
            </tr>))}</tbody></table></div>
      )}
      <nav aria-label="Pages" className="mt-6 flex items-center gap-4 text-sm">{r.page > 1 && <Link href={href(r.page - 1)} className="underline">← Previous</Link>}<span className="text-mute">Page {r.page} of {pages}</span>{r.page < pages && <Link href={href(r.page + 1)} className="underline">Next →</Link>}</nav>
    </AdminShell>
  );
}
