import { adminRoute } from "@/server/store/http";
import { setStock } from "@/server/store/repo";
import { fail } from "@/server/store/db";

export const dynamic = "force-dynamic";
/** PUT { sku, stock } — inventory update for one variant. */
export const PUT = async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return adminRoute(req, "inventory", ({ actor, body }) => {
    const b = body as { sku?: unknown; stock?: unknown };
    if (typeof b?.sku !== "string" || typeof b?.stock !== "number") return fail(422, "Send { sku: string, stock: number }");
    return setStock(actor, id, b.sku, b.stock);
  });
};
