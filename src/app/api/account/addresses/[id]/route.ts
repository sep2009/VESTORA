import { apiRoute } from "@/server/commerce/http";
import { deleteAddress, saveAddress } from "@/server/commerce/customers";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };
export const PUT = (req: Request, c: P) => apiRoute(req, { auth: "required" }, async ({ user, body }) => saveAddress(user!.id, body, (await c.params).id));
export const DELETE = (req: Request, c: P) => apiRoute(req, { auth: "required" }, async ({ user }) => deleteAddress(user!.id, (await c.params).id));
