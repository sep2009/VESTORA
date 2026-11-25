import "server-only";
import { NextResponse } from "next/server";
import { authorize, type Permission } from "@/server/auth/guard";
import type { Result } from "./db";
import { dbFailure, UNAVAILABLE } from "@/server/db/driver";

/** Standard admin route: authorise (session, role, CSRF), parse a small JSON body, run the repository call, map the result. */
export async function adminRoute(req: Request, permission: Permission | undefined, run: (ctx: { actor: string; body: unknown }) => Promise<Result<unknown>> | Result<unknown>, opts: { body?: boolean } = {}): Promise<NextResponse> {
  const auth = authorize(req, permission);
  if (!auth.ok) return auth.response;
  let body: unknown = undefined;
  if (opts.body !== false && !["GET", "DELETE", "HEAD"].includes(req.method)) {
    const text = await req.text();
    if (text.length > 400_000) return NextResponse.json({ errors: ["Request too large"] }, { status: 413 });
    try { body = text ? JSON.parse(text) : {}; } catch { return NextResponse.json({ errors: ["Body must be valid JSON"] }, { status: 400 }); }
  }
  let r: Result<unknown>;
  try { r = await run({ actor: auth.actor, body }); }
  catch (e) {
    if (dbFailure(e)) { console.error("[admin] database unavailable:", e instanceof Error ? e.message : e); return NextResponse.json({ errors: [UNAVAILABLE] }, { status: 503 }); }
    console.error("[admin]", req.method, req.url, e); return NextResponse.json({ errors: ["Something went wrong on our side. Please try again."] }, { status: 500 });
  }
  return r.ok ? NextResponse.json(r.data, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ errors: r.errors }, { status: r.status, headers: { "Cache-Control": "no-store" } });
}
