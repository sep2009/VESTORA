import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { addressInput, email as emailSchema, phone as phoneSchema, type SavedAddress, type User } from "@/modules/commerce/types";
import { fail, mutate, ok, readStore, dataDir, type Result } from "@/server/store/db";
import { hashPassword, verifyPassword } from "@/server/auth/password";

export type PublicUser = Omit<User, "passwordHash" | "passwordVersion" | "failedLogins" | "lockedUntil">;
export const publicUser = ({ passwordHash: _h, passwordVersion: _v, failedLogins: _f, lockedUntil: _l, ...rest }: User): PublicUser => rest;

const newId = (prefix: string) => `${prefix}_${randomBytes(9).toString("base64url")}`;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const MIN_PASSWORD = 10;
const LOCK_AFTER = 8, LOCK_MS = 15 * 60_000;
// Verified against when the email is unknown, so timing does not reveal which emails have accounts.
const DUMMY_HASH = "scrypt:16384:8:1:AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

function checkPassword(pw: string, email?: string): string | null {
  if (pw.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for the password`;
  if (pw.length > 200) return "Password is too long";
  if (email && pw.toLowerCase() === email.toLowerCase()) return "The password cannot be your email address";
  if (/^(.)\1+$/.test(pw) || ["password123", "1234567890", "qwertyuiop"].includes(pw.toLowerCase())) return "That password is too easy to guess";
  return null;
}

export async function register(input: { email: unknown; name: unknown; password: unknown }): Promise<Result<User>> {
  const e = emailSchema.safeParse(input.email);
  if (!e.success) return fail(400, "Enter a valid email address");
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 120) return fail(400, "Enter your name");
  const password = typeof input.password === "string" ? input.password : "";
  const pwErr = checkPassword(password, e.data);
  if (pwErr) return fail(400, pwErr);
  const passwordHash = await hashPassword(password);
  return mutate("customer", "register", (d) => {
    if (d.users.some((u) => u.email === e.data)) return fail(409, "An account with this email already exists. Sign in instead.");
    const user: User = { id: newId("u"), email: e.data, name, phone: "", passwordHash, passwordVersion: 1, addresses: [], favorites: [], createdAt: new Date().toISOString(), failedLogins: 0, lockedUntil: null };
    d.users.push(user);
    return ok(user);
  });
}

export async function login(emailRaw: unknown, passwordRaw: unknown): Promise<Result<User>> {
  const e = emailSchema.safeParse(emailRaw);
  const password = typeof passwordRaw === "string" ? passwordRaw.slice(0, 200) : "";
  const user = e.success ? readStore().data.users.find((u) => u.email === e.data) : undefined;
  if (user?.lockedUntil && user.lockedUntil > Date.now()) { await verifyPassword(password, DUMMY_HASH); return fail(429, "Too many failed attempts. Try again in 15 minutes."); }
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    if (user) await mutate("customer", "login-failed", (d) => { const u = d.users.find((x) => x.id === user.id)!; u.failedLogins += 1; if (u.failedLogins >= LOCK_AFTER) { u.lockedUntil = Date.now() + LOCK_MS; u.failedLogins = 0; } return ok(null); });
    return fail(401, "Wrong email or password");
  }
  if (user.failedLogins || user.lockedUntil) await mutate("customer", "login-ok", (d) => { const u = d.users.find((x) => x.id === user.id)!; u.failedLogins = 0; u.lockedUntil = null; return ok(null); });
  return ok(user);
}

export async function updateProfile(userId: string, input: { name?: unknown; phone?: unknown }): Promise<Result<User>> {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 120) return fail(400, "Enter your name");
  const ph = phoneSchema.safeParse(typeof input.phone === "string" ? input.phone : "");
  if (!ph.success) return fail(400, "Enter a valid phone number");
  return mutate(userId, "profile", (d) => { const u = d.users.find((x) => x.id === userId); if (!u) return fail(404, "Account not found"); u.name = name; u.phone = ph.data; return ok(u); });
}

export async function changePassword(userId: string, current: unknown, next: unknown): Promise<Result<User>> {
  const user = readStore().data.users.find((u) => u.id === userId);
  if (!user) return fail(404, "Account not found");
  if (!(await verifyPassword(typeof current === "string" ? current : "", user.passwordHash))) return fail(403, "Your current password is wrong");
  const err = checkPassword(typeof next === "string" ? next : "", user.email);
  if (err) return fail(400, err);
  const hash = await hashPassword(next as string);
  return mutate(userId, "password", (d) => { const u = d.users.find((x) => x.id === userId)!; u.passwordHash = hash; u.passwordVersion += 1; return ok(u); });
}

export function saveAddress(userId: string, input: unknown, id?: string): Promise<Result<SavedAddress>> {
  const o = (input ?? {}) as { label?: unknown; isDefault?: unknown };
  const parsed = addressInput.safeParse(input);
  if (!parsed.success) return Promise.resolve(fail(400, ...parsed.error.issues.map((i) => `${i.path.join(".") || "address"}: ${i.message}`)));
  return mutate(userId, "address", (d) => {
    const u = d.users.find((x) => x.id === userId);
    if (!u) return fail(404, "Account not found");
    const isDefault = o.isDefault === true || u.addresses.length === 0;
    const addr: SavedAddress = { ...parsed.data, id: id ?? newId("a"), label: typeof o.label === "string" ? o.label.slice(0, 40) : "", isDefault };
    if (id) { const i = u.addresses.findIndex((a) => a.id === id); if (i < 0) return fail(404, "Address not found"); u.addresses[i] = addr; }
    else { if (u.addresses.length >= 20) return fail(400, "You can save up to 20 addresses"); u.addresses.push(addr); }
    if (isDefault) u.addresses.forEach((a) => { a.isDefault = a.id === addr.id; });
    return ok(addr);
  });
}

export const deleteAddress = (userId: string, id: string): Promise<Result<null>> => mutate(userId, "address-delete", (d) => {
  const u = d.users.find((x) => x.id === userId);
  const i = u?.addresses.findIndex((a) => a.id === id) ?? -1;
  if (!u || i < 0) return fail(404, "Address not found");
  const [gone] = u.addresses.splice(i, 1);
  if (gone?.isDefault && u.addresses[0]) u.addresses[0].isDefault = true;
  return ok(null);
});

/** Favorites are product ids; the server keeps the union of this device's list and the account's, and returns it. */
export const mergeFavorites = (userId: string, ids: unknown): Promise<Result<string[]>> => mutate(userId, "favorites", (d) => {
  const u = d.users.find((x) => x.id === userId);
  if (!u) return fail(404, "Account not found");
  const known = new Set(d.products.map((p) => p.id));
  const incoming = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string" && known.has(x)) : [];
  u.favorites = [...new Set([...u.favorites.filter((id) => known.has(id)), ...incoming])].slice(0, 500);
  return ok(u.favorites);
});
export const setFavorites = (userId: string, ids: unknown): Promise<Result<string[]>> => mutate(userId, "favorites-set", (d) => {
  const u = d.users.find((x) => x.id === userId);
  if (!u) return fail(404, "Account not found");
  const known = new Set(d.products.map((p) => p.id));
  u.favorites = [...new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string" && known.has(x)) : [])].slice(0, 500);
  return ok(u.favorites);
});

/**
 * Email delivery. No mail provider is configured, so messages are written to data/db/outbox.log (and the server console)
 * instead of being sent. Replace this function with a provider call (Resend, Postmark, SES) to send real mail.
 */
export function deliverEmail(to: string, subject: string, body: string) {
  try { mkdirSync(dataDir(), { recursive: true }); appendFileSync(path.join(dataDir(), "outbox.log"), JSON.stringify({ at: new Date().toISOString(), to, subject, body }) + "\n"); } catch { /* best effort */ }
  console.info(`[mail not configured] would send "${subject}" to ${to}`);
}

const RESET_MINUTES = 60;
/** Always succeeds from the caller's point of view, so the form cannot be used to discover which emails have accounts. */
export async function requestReset(emailRaw: unknown, origin: string): Promise<void> {
  const e = emailSchema.safeParse(emailRaw);
  if (!e.success) return;
  const token = randomBytes(32).toString("base64url");
  const found = await mutate("customer", "reset-request", (d) => {
    const u = d.users.find((x) => x.email === e.data);
    if (!u) return ok(false);
    d.resetTokens = d.resetTokens.filter((t) => t.expiresAt > Date.now() && !t.used && t.userId !== u.id);
    d.resetTokens.push({ hash: sha(token), userId: u.id, expiresAt: Date.now() + RESET_MINUTES * 60_000, used: false });
    return ok(true);
  });
  if (found.ok && found.data) deliverEmail(e.data, "Reset your Vestora password", `Use this link within ${RESET_MINUTES} minutes: ${origin}/account/reset?token=${token}\nIf you did not ask for this, ignore this email.`);
}

export async function resetPassword(token: unknown, next: unknown): Promise<Result<null>> {
  if (typeof token !== "string" || token.length < 20) return fail(400, "This reset link is invalid or has expired");
  const pw = typeof next === "string" ? next : "";
  const hit = readStore().data.resetTokens.find((t) => t.hash === sha(token));
  const user = hit && !hit.used && hit.expiresAt > Date.now() ? readStore().data.users.find((u) => u.id === hit.userId) : undefined;
  if (!hit || !user) return fail(400, "This reset link is invalid or has expired");
  const err = checkPassword(pw, user.email);
  if (err) return fail(400, err);
  const hash = await hashPassword(pw);
  return mutate("customer", "reset-password", (d) => {
    const t = d.resetTokens.find((x) => x.hash === sha(token));
    if (!t || t.used || t.expiresAt <= Date.now()) return fail(400, "This reset link is invalid or has expired");
    const u = d.users.find((x) => x.id === t.userId)!;
    u.passwordHash = hash; u.passwordVersion += 1; u.failedLogins = 0; u.lockedUntil = null; t.used = true;
    return ok(null);
  });
}
