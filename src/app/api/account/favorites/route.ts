import { apiRoute } from "@/server/commerce/http";
import { mergeFavorites, setFavorites } from "@/server/commerce/customers";
import { ok } from "@/server/store/db";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => apiRoute(req, { auth: "required" }, ({ user }) => ok({ ids: user!.favorites }));
/** POST merges this device's ids into the account and returns the union; PUT replaces the account's list. */
export const POST = (req: Request) => apiRoute(req, { auth: "required" }, async ({ user, body }) => { const r = await mergeFavorites(user!.id, (body as { ids?: unknown })?.ids); return r.ok ? ok({ ids: r.data }) : r; });
export const PUT = (req: Request) => apiRoute(req, { auth: "required" }, async ({ user, body }) => { const r = await setFavorites(user!.id, (body as { ids?: unknown })?.ids); return r.ok ? ok({ ids: r.data }) : r; });
