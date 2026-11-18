import { json } from "@/server/commerce/http";
import { activeProvider } from "@/server/payments";

export const dynamic = "force-dynamic";
export const GET = () => { const p = activeProvider(); return json({ payments: p ? { provider: p.id, label: p.label, test: p.test } : null }); };
