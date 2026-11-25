import { CONSENT_VERSION, PHOTO_LIMITS, RETENTION } from "@/modules/tryon/core";
import { ok } from "@/server/store/db";
import { apiRoute } from "@/server/commerce/http";
import { providerStatus } from "@/server/tryon/providers";
import { usageFor } from "@/server/tryon/jobs";

export const dynamic = "force-dynamic";

/** Whether photo try-on is available and under what terms. Never exposes credentials or provider internals. */
export function GET(req: Request) {
  return apiRoute(req, { auth: "optional" }, async ({ user }) => {
    const st = providerStatus();
    return ok({
      available: st.available, code: st.available ? "ok" : st.code, message: st.available ? null : st.message,
      provider: st.available ? { id: st.provider.id, label: st.provider.label, test: st.provider.test, retentionNote: st.provider.retentionNote, supports: st.provider.supports } : null,
      limits: { maxMb: PHOTO_LIMITS.maxBytes / 1024 / 1024, minSide: PHOTO_LIMITS.minSide, maxSide: PHOTO_LIMITS.maxSide, types: PHOTO_LIMITS.types, retention: RETENTION },
      consentVersion: CONSENT_VERSION, signedIn: !!user, usage: user ? (await usageFor(user)) : null,
    });
  });
}
