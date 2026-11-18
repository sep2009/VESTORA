import "server-only";
import { NextResponse } from "next/server";
import { COOKIE, verifySession, type Role } from "./session";

/** What each role may do. Editors manage products, stock and uploads; only admins change taxonomy, the showroom and deletions. */
export type Permission = "product.write" | "product.delete" | "inventory" | "upload" | "taxonomy.write" | "showroom.write" | "department.write" | "orders.read" | "orders.write" | "orders.delete";
const PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ["product.write", "product.delete", "inventory", "upload", "taxonomy.write", "showroom.write", "department.write", "orders.read", "orders.write", "orders.delete"],
  editor: ["product.write", "inventory", "upload", "orders.read", "orders.write"],
};
export const can = (role: Role, p: Permission) => PERMISSIONS[role].includes(p);

const cookieOf = (req: Request, name: string) => req.headers.get("cookie")?.split(/;\s*/).map((c) => c.split("=")).find(([k]) => k === name)?.slice(1).join("=");
export const roleFromRequest = (req: Request): Role | null => (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32 ? verifySession(cookieOf(req, COOKIE))?.role ?? null : null);

export type Authorized = { ok: true; role: Role; actor: string } | { ok: false; response: NextResponse };
const deny = (status: number, message: string): Authorized => ({ ok: false, response: NextResponse.json({ errors: [message] }, { status, headers: { "Cache-Control": "no-store" } }) });

/**
 * Every admin API route calls this first. It checks the signed session cookie, the role's permission and,
 * for state-changing methods, CSRF: a custom header (browsers cannot add one cross-site without CORS, which is not enabled)
 * and, when present, an Origin that matches this server.
 */
export function authorize(req: Request, permission?: Permission): Authorized {
  const role = roleFromRequest(req);
  if (!role) return deny(401, "Not signed in");
  if (permission && !can(role, permission)) return deny(403, `Your role (${role}) cannot do this`);
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (req.headers.get("x-vestora-csrf") !== "1") return deny(403, "Missing CSRF header");
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) return deny(403, "Cross-origin request refused");
  }
  return { ok: true, role, actor: role };
}
