import { adminRoute } from "@/server/store/http";
import { setAssignment } from "@/server/store/repo";
import { fail } from "@/server/store/db";

export const dynamic = "force-dynamic";
/** PUT { productId, slotId | null } — pin a product to a fixture, or clear the pin. */
export const PUT = (req: Request) => adminRoute(req, "showroom.write", ({ actor, body }) => {
  const b = body as { productId?: unknown; slotId?: unknown };
  if (typeof b?.productId !== "string" || (b.slotId !== null && typeof b.slotId !== "string")) return fail(422, "Send { productId: string, slotId: string | null }");
  return setAssignment(actor, b.productId, b.slotId as string | null);
});
