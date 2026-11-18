import { NextResponse } from "next/server";
import { fail } from "@/server/store/db";
import { apiRoute } from "@/server/commerce/http";
import { readResult } from "@/server/tryon/jobs";

export const dynamic = "force-dynamic";

/** The generated image, to its owner only. Never cached, never indexable, never public. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return apiRoute(req, { auth: "required" }, async ({ user }) => {
    const r = /^tj_[a-f0-9]{18}$/.test(id) ? await readResult(user!, id) : null;
    if (!r) return fail(404, "Not found.");
    return new NextResponse(new Uint8Array(r.bytes), { headers: { "Content-Type": r.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex", "Content-Disposition": "inline", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  });
}
