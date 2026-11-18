import { z } from "zod";
import { fail, ok } from "@/server/store/db";
import { apiRoute } from "@/server/commerce/http";
import { deleteJobs, getJob, setSaved } from "@/server/tryon/jobs";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };
const ID = /^tj_[a-f0-9]{18}$/;

export async function GET(req: Request, { params }: P) {
  const { id } = await params;
  return apiRoute(req, { auth: "required" }, async ({ user }) => { const j = ID.test(id) ? await getJob(user!, id) : null; return j ? ok(j) : fail(404, "Not found."); });
}
export async function DELETE(req: Request, { params }: P) {
  const { id } = await params;
  return apiRoute(req, { auth: "required" }, async ({ user }) => { if (!ID.test(id) || !(await getJob(user!, id))) return fail(404, "Not found."); return ok(await deleteJobs(user!, id)); });
}
/** Keep (or stop keeping) a finished result. */
export async function PATCH(req: Request, { params }: P) {
  const { id } = await params;
  return apiRoute(req, { auth: "required" }, async ({ user, body }) => {
    const b = z.object({ saved: z.boolean() }).safeParse(body);
    if (!b.success || !ID.test(id)) return fail(422, "Invalid request.");
    return setSaved(user!, id, b.data.saved);
  });
}
