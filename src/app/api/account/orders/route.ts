import { apiRoute } from "@/server/commerce/http";
import { customerView, ordersForUser } from "@/server/commerce/orders";
import { ok } from "@/server/store/db";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => apiRoute(req, { auth: "required" }, async ({ user }) => ok({ orders: (await ordersForUser(user!.id)).map(customerView) }));
