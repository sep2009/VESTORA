import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge gate for admin PAGES: no valid signed session cookie → HTTP 307 to the sign-in page before anything renders.
 * (Admin API routes and server components verify the session again on the server; this is defence in depth.)
 * Uses Web Crypto, since the Edge runtime has no node:crypto.
 */
const enc = new TextEncoder();
const b64urlToBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function valid(token: string | undefined): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret || secret.length < 32) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  try {
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    if (!(await crypto.subtle.verify("HMAC", key, b64urlToBytes(sig), enc.encode(payload)))) return false;
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload))) as { r?: string; exp?: number };
    return (data.r === "admin" || data.r === "editor") && typeof data.exp === "number" && data.exp > Date.now();
  } catch { return false; }
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  if (await valid(req.cookies.get("vestora_session")?.value)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login"; url.search = "";
  return NextResponse.redirect(url, 307);
}

export const config = { matcher: ["/admin/:path*"] };
