import { NextResponse } from "next/server";
import { clearFailures, recordFailure, tooMany } from "@/server/auth/ratelimit";
import { verifyPassword } from "@/server/auth/password";
import { COOKIE, SESSION_HOURS, createSession, type Role } from "@/server/auth/session";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(req: Request) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32 || !process.env.ADMIN_PASSWORD_HASH) {
    return json({ errors: ["Admin sign-in is not configured. Set SESSION_SECRET and ADMIN_PASSWORD_HASH in .env.local (see .env.example)."] }, 503);
  }
  if (req.headers.get("x-vestora-csrf") !== "1") return json({ errors: ["Missing CSRF header"] }, 403);
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return json({ errors: ["Cross-origin request refused"] }, 403);

  const key = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (tooMany(key)) return json({ errors: ["Too many failed attempts. Try again in 15 minutes."] }, 429);

  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";
  // Check both hashes every time so timing does not reveal which role exists.
  const [isAdmin, isEditor] = await Promise.all([verifyPassword(password, process.env.ADMIN_PASSWORD_HASH), verifyPassword(password, process.env.EDITOR_PASSWORD_HASH)]);
  const role: Role | null = isAdmin ? "admin" : isEditor ? "editor" : null;
  if (!role) { recordFailure(key); return json({ errors: ["Wrong password"] }, 401); }

  clearFailures(key);
  const secure = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  const cookie = `${COOKIE}=${createSession(role)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${secure ? "; Secure" : ""}`;
  return json({ role }, 200, { "Set-Cookie": cookie });
}
