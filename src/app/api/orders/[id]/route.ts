import { apiRoute, errors } from "@/server/commerce/http";
import { canView, customerView, getOrder } from "@/server/commerce/orders";
import { ok } from "@/server/store/db";

export const dynamic = "force-dynamic";
/** The signed-in owner, or anyone holding the order token from the confirmation link. Same answer for "missing" and "not yours". */
export const GET = (req: Request, c: { params: Promise<{ id: string }> }) => apiRoute(req, { auth: "optional", rate: { name: "order-read", max: 120, windowMs: 60_000 } }, async ({ user }) => {
  const o = (await getOrder((await c.params).id));
  const t = new URL(req.url).searchParams.get("t");
  return o && canView(o, user, t) ? ok(customerView(o)) : errors(404, "Order not found");
});
