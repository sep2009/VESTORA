import { adminRoute } from "@/server/store/http";
import { searchOrders } from "@/server/commerce/orders";
import { ok } from "@/server/store/db";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => adminRoute(req, "orders.read", async () => {
  const sp = new URL(req.url).searchParams;
  return ok((await searchOrders({ q: sp.get("q") ?? undefined, status: sp.get("status") ?? undefined, payment: sp.get("payment") ?? undefined, page: Number(sp.get("page") ?? 1) || 1 })));
});
