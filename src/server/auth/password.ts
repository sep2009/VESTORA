import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number }) => Promise<Buffer>;
const N = 16384, R = 8, P = 1, LEN = 32;
const SEP = ":";

/**
 * Format: scrypt:N:r:p:salt(base64):hash(base64).
 * The separator is a colon, not a dollar sign: .env loaders expand dollar signs as variable references and would corrupt the hash.
 * Passwords are never stored or compared in plain text.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, LEN, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join(SEP);
}

export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  const parts = (stored ?? "").split(SEP);
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, salt, hash] = parts;
  try {
    const expected = Buffer.from(hash!, "base64");
    const actual = await scrypt(password, Buffer.from(salt!, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}
