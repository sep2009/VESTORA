import { apiRoute, json } from "@/server/commerce/http";
import { requestReset } from "@/server/commerce/customers";

export const dynamic = "force-dynamic";
/** Same answer whether or not the email has an account. */
export const POST = (req: Request) => apiRoute(req, { rate: { name: "forgot", max: 5, windowMs: 3600_000 } }, async ({ body, origin }) => {
  await requestReset((body as { email?: unknown } | undefined)?.email, origin);
  return json({ ok: true, message: "If an account exists for that email, a reset link has been sent." });
});
