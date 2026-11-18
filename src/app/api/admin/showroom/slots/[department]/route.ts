import { adminRoute } from "@/server/store/http";
import { setDepartmentSlots } from "@/server/store/repo";
import { fail, ok, readStore } from "@/server/store/db";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ department: string }> };
export const GET = async (req: Request, { params }: Ctx) => { const { department } = await params; return adminRoute(req, undefined, () => ok(readStore().data.showroom.slots.filter((s) => s.department === department))); };
/** PUT { slots: SlotRecord[] } — replaces this department's fixtures after safety validation. */
export const PUT = async (req: Request, { params }: Ctx) => { const { department } = await params; return adminRoute(req, "showroom.write", ({ actor, body }) => { const slots = (body as { slots?: unknown })?.slots; return slots === undefined ? fail(422, "Send { slots: [...] }") : setDepartmentSlots(actor, department, slots); }); };
