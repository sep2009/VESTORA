import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, verifySession, type Role } from "./session";

/** For admin PAGES: the signed session cookie is verified on the server for every request; otherwise redirect to sign-in. */
export async function requireAdminPage(): Promise<{ role: Role }> {
  const secret = process.env.SESSION_SECRET;
  const token = (await cookies()).get(COOKIE)?.value;
  const s = secret && secret.length >= 32 ? verifySession(token) : null;
  if (!s) redirect("/admin/login");
  return s;
}
export const adminConfigured = () => !!(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32 && process.env.ADMIN_PASSWORD_HASH);
