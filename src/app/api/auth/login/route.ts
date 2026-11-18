import { apiRoute, json } from "@/server/commerce/http";
import { login, publicUser } from "@/server/commerce/customers";
import { createCustomerToken, sessionCookie } from "@/server/commerce/customer-session";

export const dynamic = "force-dynamic";
export const POST = (req: Request) => apiRoute(req, { rate: { name: "login", max: 30, windowMs: 15 * 60_000 } }, async ({ body }) => {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) return json({ errors: ["Accounts are not configured on this server (SESSION_SECRET)."] }, 503);
  const b = (body ?? {}) as Record<string, unknown>;
  const r = await login(b.email, b.password);
  return r.ok ? json({ user: publicUser(r.data) }, 200, { "Set-Cookie": sessionCookie(req, createCustomerToken(r.data)) }) : r;
});
