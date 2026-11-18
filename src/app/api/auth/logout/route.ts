import { apiRoute, json } from "@/server/commerce/http";
import { sessionCookie } from "@/server/commerce/customer-session";

export const dynamic = "force-dynamic";
export const POST = (req: Request) => apiRoute(req, {}, () => json({ ok: true }, 200, { "Set-Cookie": sessionCookie(req, null) }));
