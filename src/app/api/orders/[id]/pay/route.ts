import { apiRoute, errors } from "@/server/commerce/http";
import { canView, getOrder, startPayment } from "@/server/commerce/orders";
import { activeProvider } from "@/server/payments";

export const dynamic = "force-dynamic";
/** Try the payment again for an order that is still waiting for payment. */
export const POST = (req: Request, c: { params: Promise<{ id: string }> }) => apiRoute(req, { auth: "optional", rate: { name: "order-pay", max: 20, windowMs: 3600_000 } }, async ({ user, body, origin }) => {
  const o = getOrder((await c.params).id);
  const t = (body as { t?: string } | undefined)?.t ?? null;
  if (!o || !canView(o, user, t)) return errors(404, "Order not found");
  const p = activeProvider();
  if (!p) return errors(503, "Payments are not available right now.");
  return startPayment(o.id, p, origin);
});
