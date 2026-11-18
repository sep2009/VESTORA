import { adminRoute } from "@/server/store/http";
import { createProduct, listProducts, type ProductInput } from "@/server/store/repo";
import { ok } from "@/server/store/db";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => adminRoute(req, undefined, () => ok(listProducts()));
export const POST = (req: Request) => adminRoute(req, "product.write", ({ actor, body }) => createProduct(actor, body as ProductInput));
