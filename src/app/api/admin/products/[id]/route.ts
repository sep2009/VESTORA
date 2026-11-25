import { adminRoute } from "@/server/store/http";
import { deleteProduct, getProduct, updateProduct, type ProductInput } from "@/server/store/repo";
import { fail, ok } from "@/server/store/db";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const GET = async (req: Request, { params }: Ctx) => { const { id } = await params; return adminRoute(req, undefined, async () => { const p = (await getProduct(id)); return p ? ok(p) : fail(404, "Not found"); }); };
export const PUT = async (req: Request, { params }: Ctx) => { const { id } = await params; return adminRoute(req, "product.write", ({ actor, body }) => updateProduct(actor, id, body as ProductInput)); };
export const DELETE = async (req: Request, { params }: Ctx) => { const { id } = await params; return adminRoute(req, "product.delete", ({ actor }) => deleteProduct(actor, id), { body: false }); };
