import { adminRoute } from "@/server/store/http";
import { brands, categories, collections } from "@/server/store/repo";
import { fail } from "@/server/store/db";

export const dynamic = "force-dynamic";
const repos = { brands, categories, collections } as const;
type Ctx = { params: Promise<{ kind: string; slug: string }> };
const pick = (k: string) => (k === "brands" || k === "categories" || k === "collections" ? repos[k] : null);

export const PUT = async (req: Request, { params }: Ctx) => { const { kind, slug } = await params; return adminRoute(req, "taxonomy.write", ({ actor, body }) => { const r = pick(kind); return r ? r.update(actor, slug, body) : fail(404, "Unknown taxonomy"); }); };
export const DELETE = async (req: Request, { params }: Ctx) => { const { kind, slug } = await params; return adminRoute(req, "taxonomy.write", ({ actor }) => { const r = pick(kind); return r ? r.remove(actor, slug) : fail(404, "Unknown taxonomy"); }, { body: false }); };
