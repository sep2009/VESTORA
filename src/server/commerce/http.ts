import "server-only";
import { NextResponse } from "next/server";
import type { User } from "@/modules/commerce/types";
import { customerFromRequest } from "./customer-session";
import { limited } from "./limiter";
import type { Result } from "@/server/store/db";

type Ctx = { req: Request; user: User | null; body: unknown; ip: string; origin: string };
type Opts = {
  /** "required": 401 without a signed-in customer. "optional": user may be null. */
  auth?: "required" | "optional";
  rate?: { name: string; max: number; windowMs: number };
  /** Skip the body parse (GET/DELETE always skip). */
  noBody?: boolean;
};

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
export const errors = (status: number, ...e: string[]) => json({ errors: e }, status);
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

/**
 * Standard customer-facing route: optional/required sign-in, per-IP rate limit, CSRF (custom header + same-origin) on state changes,
 * small JSON body. The handler returns a Result (mapped to JSON) or a NextResponse (for cookies and redirects).
 */
export async function apiRoute(req: Request, opts: Opts, run: (c: Ctx) => Promise<Result<unknown> | NextResponse> | Result<unknown> | NextResponse): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const ip = clientIp(req);
    if (opts.rate && limited(`${opts.rate.name}:${ip}`, opts.rate.max, opts.rate.windowMs)) return errors(429, "Too many requests. Please wait a few minutes and try again.");
    const unsafe = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    if (unsafe) {
      if (req.headers.get("x-vestora-csrf") !== "1") return errors(403, "Missing CSRF header");
      const origin = req.headers.get("origin");
      if (origin && origin !== url.origin) return errors(403, "Cross-origin request refused");
    }
    const user = customerFromRequest(req);
    if (opts.auth === "required" && !user) return errors(401, "Please sign in");
    let body: unknown = undefined;
    if (unsafe && req.method !== "DELETE" && !opts.noBody) {
      const text = await req.text();
      if (text.length > 100_000) return errors(413, "Request too large");
      try { body = text ? JSON.parse(text) : {}; } catch { return errors(400, "Body must be valid JSON"); }
    }
    const r = await run({ req, user, body, ip, origin: url.origin });
    if (r instanceof NextResponse) return r;
    return r.ok ? json(r.data) : errors(r.status, ...r.errors);
  } catch (e) {
    console.error("[api]", req.method, req.url, e);
    return errors(500, "Something went wrong on our side. Please try again.");
  }
}
