import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readStore } from "@/server/store/db";
import type { User } from "@/modules/commerce/types";

export const CUSTOMER_COOKIE = "vestora_customer";
export const CUSTOMER_DAYS = 14;

const key = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters");
  // A different key from the admin session, so one kind of cookie can never be replayed as the other.
  return createHmac("sha256", s).update("vestora-customer-session").digest();
};
const sign = (p: string) => createHmac("sha256", key()).update(p).digest();

export function createCustomerToken(user: Pick<User, "id" | "passwordVersion">, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ u: user.id, pv: user.passwordVersion, exp: now + CUSTOMER_DAYS * 86_400_000 })).toString("base64url");
  return `${payload}.${sign(payload).toString("base64url")}`;
}

export function verifyCustomerToken(token: string | undefined | null, now = Date.now()): User | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const expected = sign(payload), given = Buffer.from(sig, "base64url");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    const d = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u?: string; pv?: number; exp?: number };
    if (typeof d.u !== "string" || typeof d.exp !== "number" || d.exp < now) return null;
    const user = readStore().data.users.find((x) => x.id === d.u);
    return user && user.passwordVersion === d.pv ? user : null;
  } catch { return null; }
}

const cookieOf = (req: Request) => req.headers.get("cookie")?.split(/;\s*/).map((c) => c.split("=")).find(([k]) => k === CUSTOMER_COOKIE)?.slice(1).join("=");
export const customerFromRequest = (req: Request): User | null => (process.env.SESSION_SECRET ? verifyCustomerToken(cookieOf(req)) : null);

export function sessionCookie(req: Request, token: string | null): string {
  const secure = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  // Lax, not Strict: the shopper returns from the payment provider's site and must still be signed in.
  return `${CUSTOMER_COOKIE}=${token ?? ""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? CUSTOMER_DAYS * 86400 : 0}${secure ? "; Secure" : ""}`;
}
