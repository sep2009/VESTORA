import { apiRoute, errors } from "@/server/commerce/http";
import { abandonOrder, createOrder, orderToken, startPayment } from "@/server/commerce/orders";
import { activeProvider } from "@/server/payments";
import { ok } from "@/server/store/db";

export const dynamic = "force-dynamic";

/**
 * Places an order and opens the payment. Everything is re-validated here (address, method, price, stock); the browser's
 * numbers are ignored. The order is "awaiting payment" and is never marked paid by this route: only the provider's webhook does that.
 */
export const POST = (req: Request) => apiRoute(req, { auth: "optional", rate: { name: "checkout", max: 30, windowMs: 3600_000 } }, async ({ user, body, origin }) => {
  const provider = activeProvider();
  if (!provider) return errors(503, "Payments are not configured on this server, so orders cannot be placed. Nothing was charged.");
  const created = await createOrder(body, user, provider);
  if (!created.ok) return created;
  if (created.data.payment.status === "paid") return ok({ orderId: created.data.id, token: orderToken(created.data.id), redirectUrl: `/checkout/confirmation/${created.data.id}?t=${orderToken(created.data.id)}`, provider: provider.id, test: provider.test });
  const started = await startPayment(created.data.id, provider, origin);
  if (!started.ok) { await abandonOrder(created.data.id, "Payment could not be started."); return started; }
  return ok({ orderId: created.data.id, token: orderToken(created.data.id), redirectUrl: started.data.redirectUrl, provider: provider.id, test: provider.test });
});
