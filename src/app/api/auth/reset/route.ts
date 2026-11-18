import { apiRoute } from "@/server/commerce/http";
import { resetPassword } from "@/server/commerce/customers";

export const dynamic = "force-dynamic";
export const POST = (req: Request) => apiRoute(req, { rate: { name: "reset", max: 10, windowMs: 3600_000 } }, async ({ body }) => {
  const b = (body ?? {}) as Record<string, unknown>;
  return resetPassword(b.token, b.password);
});
