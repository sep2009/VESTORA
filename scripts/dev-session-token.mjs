// Dev/test helper: prints a signed 1-hour session token for the given role using SESSION_SECRET from .env.local.
// Usage: node scripts/dev-session-token.mjs [admin|editor]
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const secret = readFileSync(".env.local", "utf8").match(/^SESSION_SECRET=(.+)$/m)?.[1];
if (!secret) throw new Error("SESSION_SECRET not found in .env.local");
const role = process.argv[2] === "editor" ? "editor" : "admin";
const now = Date.now();
const payload = Buffer.from(JSON.stringify({ r: role, iat: now, exp: now + 3600_000, n: randomBytes(8).toString("hex") })).toString("base64url");
const sig = createHmac("sha256", secret).update(payload).digest("base64url");
console.log(payload + "." + sig);
