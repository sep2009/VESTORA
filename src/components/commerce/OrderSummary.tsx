import { formatMoney } from "@/lib/money";
import type { Order } from "@/modules/commerce/types";

const m = (amount: number, currency: string) => formatMoney({ amount, currency });
const LABEL: Record<string, string> = { awaiting_payment: "Awaiting payment", processing: "Processing", packed: "Packed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled", needs_attention: "Needs attention" };
const PAY: Record<string, string> = { pending: "Waiting for the provider", paid: "Paid", failed: "Failed", cancelled: "Cancelled", expired: "Expired" };
export const orderStatusLabel = (s: string) => LABEL[s] ?? s;
export const paymentStatusLabel = (s: string) => PAY[s] ?? s;

/** Read-only order record: what was bought, at what price, where it goes, and the payment and order status. Works on server and client. */
export function OrderSummary({ order, admin = false }: { order: Order; admin?: boolean }) {
  const t = order.totals, a = order.shippingAddress;
  return (
    <div className="space-y-6">
      <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-4"><dt className="text-mute">Order</dt><dd className="font-mono">{order.id}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-mute">Placed</dt><dd>{new Date(order.createdAt).toLocaleString("en-GB")}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-mute">Order status</dt><dd>{orderStatusLabel(order.status)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-mute">Payment</dt><dd>{paymentStatusLabel(order.payment.status)}{order.payment.test ? " (test, no money)" : ""}</dd></div>
        {order.tracking && <div className="flex justify-between gap-4"><dt className="text-mute">Tracking</dt><dd>{order.tracking}</dd></div>}
        {admin && <div className="flex justify-between gap-4"><dt className="text-mute">Provider ref</dt><dd className="break-all font-mono text-xs">{order.payment.providerRef ?? "—"}</dd></div>}
      </dl>
      <ul className="divide-y divide-line border-y border-line">
        {order.lines.map((l) => (
          <li key={l.sku} className="flex gap-4 py-4">
            <div className="h-20 w-16 shrink-0 overflow-hidden rounded-sm bg-ink/6">{l.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={l.image} alt={l.name} className="size-full object-cover" />}</div>
            <div className="min-w-0 flex-1 text-sm"><p className="text-[11px] uppercase tracking-[0.16em] text-mute">{l.brandName}</p><p className="font-medium">{l.name}</p>
              <p className="text-mute">{[l.size && `Size ${l.size}`, l.color, `SKU ${l.sku}`, `Qty ${l.quantity}`].filter(Boolean).join(" · ")}{l.demo ? " · demo product" : ""}</p></div>
            <p className="text-right text-sm">{m(l.unitPrice * l.quantity, t.currency)}{l.unitRegular > l.unitPrice && <s className="block text-xs text-mute">{m(l.unitRegular * l.quantity, t.currency)}</s>}<span className="block text-xs text-mute">{m(l.unitPrice, t.currency)} each</span></p>
          </li>
        ))}
      </ul>
      <div className="grid gap-6 sm:grid-cols-2">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between"><dt>Items (list price)</dt><dd>{m(t.subtotalRegular, t.currency)}</dd></div>
          {t.discount > 0 && <div className="flex justify-between"><dt>Discounts</dt><dd>−{m(t.discount, t.currency)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping ({order.shippingMethod.label})</dt><dd>{t.shipping === 0 ? "Free" : m(t.shipping, t.currency)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-medium"><dt>Total</dt><dd>{m(t.total, t.currency)}</dd></div>
          <p className="text-xs text-mute">Taxes were not calculated.</p>
        </dl>
        <div className="text-sm"><p className="mb-1 text-xs uppercase tracking-[0.14em] text-mute">Ships to</p>
          <address className="not-italic">{a.fullName}<br />{a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />{a.postalCode} {a.city}{a.region ? `, ${a.region}` : ""}<br />{a.country}</address>
          <p className="mt-2 text-mute">{order.shippingMethod.label}: {order.shippingMethod.estimate}</p>
          <p className="mt-2 text-mute">{order.customer.name} · {order.customer.email}</p></div>
      </div>
    </div>
  );
}
