import { z } from "zod";
import { buildDiscovery, noSignals, sanitizeProfile, sanitizeSignals } from "@/modules/style/core";
import { apiRoute } from "@/server/commerce/http";
import { ordersForUser } from "@/server/commerce/orders";
import { getFacts, getNames, getStyleItems } from "@/server/catalog/style-items";
import { liteDiscovery } from "@/server/style/lite";
import { fail, ok } from "@/server/store/db";

export const dynamic = "force-dynamic";

/**
 * Recommendations from ordinary rules over the product database. No AI provider is involved.
 * Learning signals count only if the shopper switched them on. Purchases are read from the signed-in account on the server, never from the request.
 */
export function POST(req: Request) {
  return apiRoute(req, { auth: "optional", rate: { name: "style-recommend", max: 120, windowMs: 60_000 } }, async ({ user, body }) => {
    const b = z.object({ profile: z.unknown().optional(), signals: z.unknown().optional(), limit: z.number().int().min(1).max(40).optional() }).safeParse(body);
    if (!b.success) return fail(422, "Invalid request.");
    const items = (await getStyleItems()), facts = (await getFacts(items)), names = (await getNames(facts));
    const profile = b.data.profile ? sanitizeProfile(b.data.profile, facts) : null;
    if (b.data.profile && !profile) return fail(422, "The style profile is not valid.");
    const known = new Set(items.map((i) => i.id));
    const signals = b.data.signals ? sanitizeSignals(b.data.signals, known) : noSignals();
    signals.purchases = [];
    if (user && signals.consent.purchases) {
      const paid = (await ordersForUser(user.id)).filter((o) => o.payment.status === "paid");
      signals.purchases = [...new Set(paid.flatMap((o) => o.lines.map((l) => l.productId)))].filter((id) => known.has(id)).slice(0, 300);
    } else signals.consent.purchases = false;
    return ok({ ...liteDiscovery(buildDiscovery(items, profile, signals, names, { limit: b.data.limit })), profileTags: profile?.derived.tags ?? [] });
  });
}
