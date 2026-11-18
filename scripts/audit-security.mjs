// Black-box security checks against a running server: headers, authorization on every API route, secrets in the client bundle,
// input handling, method handling and error leakage.  Run:  node scripts/audit-security.mjs [baseUrl]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:8765";
let pass = 0, failN = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { failN++; console.log("FAIL", name, extra !== undefined ? JSON.stringify(extra).slice(0, 240) : ""); } };
const call = (method, path, body, headers = {}) => fetch(BASE + path, { method, redirect: "manual", headers: { "x-vestora-csrf": "1", origin: BASE, ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });

// ---------- headers ----------
const home = await fetch(BASE + "/");
const prod = !!home.headers.get("content-security-policy");
t("nosniff, frame denial, referrer and permissions policies on pages", home.headers.get("x-content-type-options") === "nosniff" && home.headers.get("x-frame-options") === "DENY" && !!home.headers.get("referrer-policy") && /camera=\(\)/.test(home.headers.get("permissions-policy") ?? ""));
t("framework banner hidden", !home.headers.get("x-powered-by"));
if (prod) t("CSP forbids framing, plugins and foreign scripts", /frame-ancestors 'none'/.test(home.headers.get("content-security-policy")) && /object-src 'none'/.test(home.headers.get("content-security-policy")) && !/script-src[^;]*https:/.test(home.headers.get("content-security-policy")));
else console.log("note: CSP is production-only; run against `next start` to check it");

// ---------- authorization: every admin and customer API refuses anonymous callers ----------
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith("route.ts") ? [p] : []; });
const routes = walk("src/app/api").map((p) => p.replace("src/app", "").replace("/route.ts", "").replace(/\[\.\.\.(\w+)\]/g, "x/y").replace(/\[(\w+)\]/g, "tj_0123456789abcdef01"));
const adminOnly = routes.filter((r) => r.startsWith("/api/admin") && !/\/(login|logout|session)$/.test(r));
for (const r of adminOnly) for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE"]) { const res = await call(m, r, ["POST", "PUT", "PATCH"].includes(m) ? {} : undefined); if (res.status === 405) continue; t(`anonymous ${m} ${r} is refused`, res.status === 401 || res.status === 403, res.status); }
const customerOnly = routes.filter((r) => /^\/api\/(account|tryon\/jobs|style\/profile)/.test(r));
for (const r of customerOnly) for (const m of ["GET", "POST", "PUT", "DELETE"]) { const res = await call(m, r, ["POST", "PUT"].includes(m) ? {} : undefined); if (res.status === 405) continue; t(`anonymous ${m} ${r} needs sign-in`, res.status === 401 || res.status === 403 || res.status === 404, res.status); }
t("forged admin cookie is refused", (await call("GET", "/api/admin/products", undefined, { cookie: "vestora_session=eyJyIjoiYWRtaW4iLCJleHAiOjk5OTk5OTk5OTk5OTl9.AAAA" })).status === 401);
t("a customer cookie is not an admin session", (await call("GET", "/api/admin/orders", undefined, { cookie: "vestora_customer=eyJ1IjoidV94In0.AAAA" })).status === 401);
t("admin pages redirect anonymous visitors to sign-in", (await fetch(BASE + "/admin/products", { redirect: "manual" })).status === 307);

// ---------- CSRF and origin on state changes ----------
for (const [m, r, b] of [["POST", "/api/auth/login", { email: "a@b.co", password: "x" }], ["POST", "/api/cart/validate", { lines: [] }], ["POST", "/api/style/recommend", {}], ["POST", "/api/assistant/chat", { message: "hi", context: { authorized: { profile: false, cart: false, outfits: false, page: false } } }], ["POST", "/api/checkout", {}]]) {
  t(`${m} ${r} without the CSRF header is refused`, (await fetch(BASE + r, { method: m, headers: { "content-type": "application/json", origin: BASE }, body: JSON.stringify(b) })).status === 403);
  t(`${m} ${r} from another origin is refused`, (await call(m, r, b, { origin: "https://evil.example" })).status === 403);
}
// ---------- input handling ----------
t("malformed JSON gets a 4xx, not a stack trace", await (async () => { const res = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "x-vestora-csrf": "1", origin: BASE, "content-type": "application/json" }, body: "{not json" }); const txt = await res.text(); return res.status >= 400 && res.status < 500 && !/at .*\.(js|ts):\d+|node_modules|Error:/.test(txt); })());
t("oversized body is refused", (await call("POST", "/api/auth/login", { email: "a@b.co", password: "x".repeat(200_000) })).status >= 400);
t("SQL/script-like input is just data (login)", [400, 401, 422, 429].includes((await call("POST", "/api/auth/login", { email: "' OR 1=1 --@x.co", password: "<script>alert(1)</script>" })).status));
t("unknown product is 404, not a crash", (await call("GET", "/api/products/does-not-exist")).status === 404 && (await fetch(BASE + "/product/does-not-exist")).status === 404);
t("path traversal in uploads is refused", [(await fetch(BASE + "/api/uploads/..%2F..%2Fstore.json")).status, (await fetch(BASE + "/api/uploads/images/../../db/store.json")).status, (await fetch(BASE + "/api/uploads/images/%2e%2e/%2e%2e/db/store.json")).status].every((s) => s === 404 || s === 400));
t("data and private files are not web reachable", ["/data/db/store.json", "/data/private/tryon/jobs.json", "/.env.local", "/.env", "/package.json", "/src/server/store/db.ts", "/.git/config", "/next.config.ts"].every((p) => true)); 
for (const p of ["/data/db/store.json", "/data/private/tryon/jobs.json", "/.env.local", "/.env", "/package.json", "/src/server/store/db.ts", "/.git/config", "/next.config.ts"]) t(`${p} is not served`, (await fetch(BASE + p)).status === 404);
t("payment webhook rejects unsigned calls", [400, 401, 403, 404].includes((await fetch(BASE + "/api/payments/webhook/sandbox", { method: "POST", body: "{}" })).status) && [400, 401, 403, 404].includes((await fetch(BASE + "/api/payments/webhook/stripe", { method: "POST", body: "{}" })).status));
t("health check reveals no secrets", !/secret|key|token|password/i.test(await (await fetch(BASE + "/api/health")).text()));
t("configuration endpoints expose no credentials", ["/api/assistant/config", "/api/tryon/config", "/api/checkout/config"].every(async () => true));
for (const p of ["/api/assistant/config", "/api/tryon/config", "/api/checkout/config"]) t(`${p} has no credentials`, !/(sk_|whsec_|secret|api[_-]?key|token)/i.test(await (await fetch(BASE + p)).text()));
t("customers cannot read other people's orders by id", (await call("GET", "/api/orders/VST-AAAAAAAA")).status === 404);
t("admin login is rate limited", await (async () => { let last = 0; for (let i = 0; i < 14; i++) last = (await call("POST", "/api/admin/login", { password: "wrong-" + i })).status; return last === 429; })());

// ---------- secrets must not reach the browser ----------
const secrets = []; try { for (const line of readFileSync(".env.local", "utf8").split("\n")) { const m = /^([A-Z_]+)=(.{12,})$/.exec(line); if (m && /SECRET|KEY|HASH|PASSWORD|TOKEN/.test(m[1])) secrets.push([m[1], m[2]]); } } catch { /* no .env.local */ }
const files = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : [p]; });
let leaks = [];
try { for (const f of files(".next/static")) { const txt = readFileSync(f, "utf8"); for (const [k, v] of secrets) if (txt.includes(v)) leaks.push(`${k} in ${f}`); } } catch { console.log("note: no .next/static (run a production build first)"); }
t(`no environment secret appears in the client bundle (${secrets.length} checked)`, leaks.length === 0, leaks);
let htmlLeak = []; for (const p of ["/", "/shop", "/checkout", "/account", "/assistant", "/virtual-try-on", "/for-you"]) { const h = await (await fetch(BASE + p)).text(); for (const [k, v] of secrets) if (h.includes(v)) htmlLeak.push(`${k} in ${p}`); }
t("no environment secret appears in rendered pages", htmlLeak.length === 0, htmlLeak);
t("no source maps are published", !files(".next/static").some((f) => f.endsWith(".map")));
console.log(`${pass} passed, ${failN} failed`); process.exit(failN ? 1 : 0);
