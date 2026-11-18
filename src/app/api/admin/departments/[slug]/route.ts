import { adminRoute } from "@/server/store/http";
import { updateDepartment } from "@/server/store/repo";

export const dynamic = "force-dynamic";
export const PUT = async (req: Request, { params }: { params: Promise<{ slug: string }> }) => { const { slug } = await params; return adminRoute(req, "department.write", ({ actor, body }) => updateDepartment(actor, slug, body)); };
