import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type Role = "admin" | "editor";
export const COOKIE = "vestora_session";
export const SESSION_HOURS = 8;

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters");
  return s;
};
const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest();

/** Signed, expiring token: base64url(payload).base64url(HMAC-SHA256). Holds only the role and expiry, no secrets. */
export function createSession(role: Role, now = Date.now()): string {
  const payload = b64(JSON.stringify({ r: role, iat: now, exp: now + SESSION_HOURS * 3600_000, n: randomBytes(8).toString("hex") }));
  return `${payload}.${b64(sign(payload))}`;
}

export function verifySession(token: string | undefined | null, now = Date.now()): { role: Role } | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const expected = sign(payload), given = Buffer.from(sig, "base64url");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { r?: string; exp?: number };
    if ((data.r !== "admin" && data.r !== "editor") || typeof data.exp !== "number" || data.exp < now) return null;
    return { role: data.r };
  } catch { return null; }
}
