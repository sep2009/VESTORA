import { NextResponse } from "next/server";
import { getProductDetail } from "@/server/catalog/detail";

export const dynamic = "force-dynamic";

/** Public, read-only: the same record the product page renders. Used by the 3D mall's product sheet. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const d = (await getProductDetail((await ctx.params).slug));
  return d ? NextResponse.json(d, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
