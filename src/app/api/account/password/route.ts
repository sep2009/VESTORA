import { apiRoute, json } from "@/server/commerce/http";
import { changePassword } from "@/server/commerce/customers";
import { createCustomerToken, sessionCookie } from "@/server/commerce/customer-session";

export const dynamic = "force-dynamic";
/** Changing the password signs out every other device; this one gets a fresh cookie. */
export const PUT = (req: Request) => apiRoute(req, { auth: "required", rate: { name: "password", max: 10, windowMs: 3600_000 } }, async ({ user, body }) => {
  const b = (body ?? {}) as Record<string, unknown>;
  const r = await changePassword(user!.id, b.current, b.password);
  return r.ok ? json({ ok: true }, 200, { "Set-Cookie": sessionCookie(req, createCustomerToken(r.data)) }) : r;
});
