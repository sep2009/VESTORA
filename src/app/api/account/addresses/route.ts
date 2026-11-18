import { apiRoute } from "@/server/commerce/http";
import { saveAddress } from "@/server/commerce/customers";
import { ok } from "@/server/store/db";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => apiRoute(req, { auth: "required" }, ({ user }) => ok({ addresses: user!.addresses }));
export const POST = (req: Request) => apiRoute(req, { auth: "required" }, ({ user, body }) => saveAddress(user!.id, body));
