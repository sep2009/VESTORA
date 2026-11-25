import { adminRoute } from "@/server/store/http";
import { brands, categories, collections } from "@/server/store/repo";
import { fail } from "@/server/store/db";
import { readStore } from "@/server/store/db";
import { ok } from "@/server/store/db";

export const dynamic = "force-dynamic";
const repos = { brands, categories, collections } as const;
type Kind = keyof typeof repos;
const known = (k: string): k is Kind => k in repos;

export const GET = async (req: Request, { params }: { params: Promise<{ kind: string }> }) => { const { kind } = await params; return adminRoute(req, undefined, async () => (known(kind) ? ok((await readStore()).data[kind]) : fail(404, "Unknown taxonomy"))); };
export const POST = async (req: Request, { params }: { params: Promise<{ kind: string }> }) => { const { kind } = await params; return adminRoute(req, "taxonomy.write", ({ actor, body }) => (known(kind) ? repos[kind].create(actor, body) : fail(404, "Unknown taxonomy"))); };
