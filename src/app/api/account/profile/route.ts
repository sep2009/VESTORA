import { apiRoute } from "@/server/commerce/http";
import { publicUser, updateProfile } from "@/server/commerce/customers";
import { ok } from "@/server/store/db";

export const dynamic = "force-dynamic";
export const PUT = (req: Request) => apiRoute(req, { auth: "required" }, async ({ user, body }) => {
  const r = await updateProfile(user!.id, (body ?? {}) as { name?: unknown; phone?: unknown });
  return r.ok ? ok({ user: publicUser(r.data) }) : r;
});
