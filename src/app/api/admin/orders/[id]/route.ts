import { adminRoute } from "@/server/store/http";
import { deleteOrder, getOrder, updateFulfilment } from "@/server/commerce/orders";
import { fail, ok } from "@/server/store/db";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };
export const GET = (req: Request, c: P) => adminRoute(req, "orders.read", async () => { const o = (await getOrder((await c.params).id)); return o ? ok(o) : fail(404, "Order not found"); });
export const PATCH = (req: Request, c: P) => adminRoute(req, "orders.write", async ({ actor, body }) => updateFulfilment((await c.params).id, actor, (body ?? {}) as Record<string, unknown>));
export const DELETE = (req: Request, c: P) => adminRoute(req, "orders.delete", async ({ actor }) => deleteOrder((await c.params).id, actor));
