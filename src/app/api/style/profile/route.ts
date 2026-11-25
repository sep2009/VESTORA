import { z } from "zod";
import { deriveProfile, sanitizeAnswers, NO_CONSENT, type Consent } from "@/modules/style/core";
import { apiRoute } from "@/server/commerce/http";
import { getFacts, getStyleItems } from "@/server/catalog/style-items";
import { deleteStored, getStored, putStored } from "@/server/style/profiles";
import { fail, ok } from "@/server/store/db";

export const dynamic = "force-dynamic";
const consent = z.object({ favorites: z.boolean(), outfits: z.boolean(), views: z.boolean(), purchases: z.boolean() });

/** The signed-in shopper's saved quiz answers and personalization choices (so they follow the account). */
export function GET(req: Request) {
  return apiRoute(req, { auth: "required" }, async ({ user }) => {
    const rec = (await getStored(user!.id)); if (!rec) return ok({ profile: null, consent: NO_CONSENT });
    const facts = (await getFacts(await getStyleItems())), a = sanitizeAnswers(rec.answers, facts);
    return ok({ profile: a ? deriveProfile(a, facts, rec.updatedAt, rec.createdAt) : null, consent: rec.consent });
  });
}
export function PUT(req: Request) {
  return apiRoute(req, { auth: "required" }, async ({ user, body }) => {
    const b = z.object({ answers: z.unknown(), consent }).safeParse(body);
    if (!b.success) return fail(422, "Invalid request.");
    const facts = (await getFacts(await getStyleItems())), a = sanitizeAnswers(b.data.answers, facts);
    if (!a) return fail(422, "The answers are not valid.");
    const rec = await putStored(user!.id, a, b.data.consent as Consent);
    return ok({ profile: deriveProfile(a, facts, rec.updatedAt, rec.createdAt), consent: rec.consent });
  });
}
/** Delete the saved profile and choices from the account. */
export function DELETE(req: Request) { return apiRoute(req, { auth: "required" }, async ({ user }) => ok({ deleted: await deleteStored(user!.id) })); }
