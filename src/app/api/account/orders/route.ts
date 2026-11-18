import { apiRoute } from "@/server/commerce/http";
import { customerView, ordersForUser } from "@/server/commerce/orders";
import { ok } from "@/server/store/db";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => apiRoute(req, { auth: "required" }, ({ user }) => ok({ orders: ordersForUser(user!.id).map(customerView) }));
