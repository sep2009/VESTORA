import { apiRoute, json } from "@/server/commerce/http";
import { publicUser } from "@/server/commerce/customers";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => apiRoute(req, { auth: "optional" }, ({ user }) => json({ user: user ? publicUser(user) : null }));
