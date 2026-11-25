import { randomUUID } from "node:crypto";
import { apiRoute, errors, json } from "@/server/commerce/http";
import { getOrder, orderToken } from "@/server/commerce/orders";
import { activeProvider } from "@/server/payments";
import { signSandbox } from "@/server/payments/sandbox";
import { handleWebhook } from "@/server/payments/webhook";

export const dynamic = "force-dynamic";

const TYPES = { pay: "paid", fail: "failed", cancel: "cancelled", pending: "pending", expire: "expired" } as const;

/**
 * Test-payment page backend. It only exists while the sandbox provider is active, and it does not touch the order itself:
 * it signs an event and delivers it through the same webhook handler a real provider uses.
 */
export const POST = (req: Request, c: { params: Promise<{ orderId: string }> }) => apiRoute(req, { rate: { name: "sandbox", max: 60, windowMs: 60_000 } }, async ({ body }) => {
  const p = activeProvider();
  if (!p || p.id !== "sandbox") return errors(404, "The test payment provider is not active.");
  const b = (body ?? {}) as { outcome?: keyof typeof TYPES; eventId?: string; t?: string; amount?: number };
  const order = (await getOrder((await c.params).orderId));
  if (!order || b.t !== orderToken(order.id)) return errors(404, "Order not found");
  const type = b.outcome ? TYPES[b.outcome] : undefined;
  if (!type) return errors(400, "Unknown outcome");
  const event = { id: b.eventId && /^[\w-]{8,64}$/.test(b.eventId) ? b.eventId : `sbx_evt_${randomUUID()}`, type, orderId: order.id, providerRef: order.payment.providerRef, amount: typeof b.amount === "number" ? b.amount : order.totals.total, currency: order.totals.currency };
  const raw = JSON.stringify(event);
  const r = await handleWebhook("sandbox", raw, new Headers({ "x-sandbox-signature": signSandbox(raw, process.env.PAYMENT_WEBHOOK_SECRET!) }));
  return json({ ...r.body, eventId: event.id }, r.status);
});
