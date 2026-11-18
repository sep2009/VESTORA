import { apiRoute } from "@/server/commerce/http";
import { assistantProviderStatus } from "@/server/assistant/providers";
import { ok } from "@/server/store/db";

export const dynamic = "force-dynamic";
/** Which engine answers: the built-in rules, or a configured model (with what happens to messages). No credentials are exposed. */
export function GET(req: Request) {
  return apiRoute(req, { auth: "optional" }, () => {
    const st = assistantProviderStatus();
    return ok(st.available ? { mode: "provider", provider: { id: st.provider.id, label: st.provider.label, test: st.provider.test, privacyNote: st.provider.privacyNote }, message: null } : { mode: "rules", provider: null, message: st.message });
  });
}
