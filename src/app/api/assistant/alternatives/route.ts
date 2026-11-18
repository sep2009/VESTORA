import { z } from "zod";
import { SLOTS } from "@/modules/outfit/core";
import { apiRoute } from "@/server/commerce/http";
import { alternatives } from "@/server/assistant/chat";
import { fail, ok } from "@/server/store/db";

export const dynamic = "force-dynamic";
const body = z.object({
  state: z.unknown().optional(), outfitIds: z.array(z.string().max(80)).min(1).max(10), slot: z.enum(SLOTS), exclude: z.array(z.string().max(80)).max(40).optional(), limit: z.number().int().min(1000).max(10_000_000).optional(),
  context: z.object({ authorized: z.object({ profile: z.boolean(), cart: z.boolean(), outfits: z.boolean(), page: z.boolean() }), profileAnswers: z.unknown().optional() }),
});
/** Compatible, in-stock replacements for one piece of an outfit, from the catalog. */
export function POST(req: Request) {
  return apiRoute(req, { auth: "optional", rate: { name: "assistant-alt", max: 60, windowMs: 60_000 } }, ({ body: raw }) => {
    const b = body.safeParse(raw); if (!b.success) return fail(422, "Invalid request.");
    return ok({ items: alternatives({ state: b.data.state, context: b.data.context, outfitIds: b.data.outfitIds, slot: b.data.slot, exclude: b.data.exclude, limit: b.data.limit }) });
  });
}
