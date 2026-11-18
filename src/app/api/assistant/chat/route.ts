import { z } from "zod";
import { apiRoute } from "@/server/commerce/http";
import { chat } from "@/server/assistant/chat";
import { fail, ok } from "@/server/store/db";

export const dynamic = "force-dynamic";

const context = z.object({
  authorized: z.object({ profile: z.boolean(), cart: z.boolean(), outfits: z.boolean(), page: z.boolean() }),
  profileAnswers: z.unknown().optional(), cartProductIds: z.array(z.string().max(80)).max(100).optional(), savedOutfitProductIds: z.array(z.string().max(80)).max(100).optional(),
  currentProductId: z.string().max(80).nullable().optional(), currentDepartment: z.string().max(40).nullable().optional(),
});
const body = z.object({
  message: z.string().trim().min(1).max(500), state: z.unknown().optional(), context, testMode: z.string().max(20).nullable().optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(600) })).max(8).optional(),
});

/**
 * One chat turn. The rule-based stylist always works; a configured language model is used only through validated tool functions.
 * Message text is not logged or stored. Personal context (style profile, cart, saved outfits, current page) is used only when the request says the shopper allowed it.
 */
export function POST(req: Request) {
  return apiRoute(req, { auth: "optional", rate: { name: "assistant-chat", max: Number(process.env.ASSISTANT_RATE_PER_MIN) || 30, windowMs: 60_000 } }, async ({ body: raw }) => {
    const b = body.safeParse(raw); if (!b.success) return fail(422, "Please send a short message (up to 500 characters).");
    return ok(await chat({ message: b.data.message, state: b.data.state, context: b.data.context, history: b.data.history, testMode: b.data.testMode }));
  });
}
