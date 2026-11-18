import { NextResponse } from "next/server";
import { handleWebhook } from "@/server/payments/webhook";

export const dynamic = "force-dynamic";

/** Provider callbacks. No cookies and no CSRF header: authenticity comes from the provider's signature over the raw body. */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const raw = await req.text();
  const r = await handleWebhook((await ctx.params).provider, raw, req.headers);
  return NextResponse.json(r.body, { status: r.status, headers: { "Cache-Control": "no-store" } });
}
