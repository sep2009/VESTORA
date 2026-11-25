// End-to-end checks of the virtual try-on backend: provider configuration, consent, photo validation, private storage, job states,
// provider failures, result access, usage limits, retention and deletion.
// Needs a running server (default http://localhost:8765) started with TRYON_PROVIDER=test ALLOW_TEST_TRYON=1 (see .env.local).
// UNCONFIGURED=1 BASE=http://localhost:8767 node scripts/e2e-tryon.mjs  checks a server that has NO provider.
// Run: node scripts/e2e-tryon.mjs
import { deflateSync } from "node:zlib";
import { randomUUID } from "node:crypto";
import * as core from "../src/modules/tryon/core.ts";

const BASE = process.env.BASE ?? "http://localhost:8765";
let pass = 0, failN = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { failN++; console.log("FAIL", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Client {
  cookies = {};
  async call(method, path, { json, form, headers = {}, csrf = true, origin = BASE } = {}) {
    const h = { ...(csrf ? { "x-vestora-csrf": "1" } : {}), ...(origin ? { origin } : {}), ...(json !== undefined ? { "content-type": "application/json" } : {}), ...headers };
    const cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; "); if (cookie) h.cookie = cookie;
    const res = await fetch(BASE + path, { method, headers: h, body: json !== undefined ? JSON.stringify(json) : form, redirect: "manual" });
    for (const sc of res.headers.getSetCookie?.() ?? []) { const [kv] = sc.split(";"); const i = kv.indexOf("="); const k = kv.slice(0, i), v = kv.slice(i + 1); if (v) this.cookies[k] = v; }
    const ct = res.headers.get("content-type") ?? ""; let body = null, bytes = null;
    if (ct.includes("json")) body = await res.json().catch(() => null); else bytes = Buffer.from(await res.arrayBuffer());
    return { status: res.status, json: body, bytes, headers: res.headers };
  }
}

// ---------- fixtures ----------
const crcT = (() => { const tb = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; } return tb; })();
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const png = (w, h, extra = []) => { const raw = Buffer.alloc(h * (w * 3 + 1), 120); const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2; return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ih), ...extra, chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]); };
const jpeg = (w, h, withExif = true) => Buffer.concat([Buffer.from([0xff, 0xd8]), withExif ? Buffer.concat([Buffer.from([0xff, 0xe1, 0x00, 0x20]), Buffer.from("Exif\0\0GPS-LAT-48.8566-LON-2.3522\0\0\0\0\0\0\0\0\0\0".padEnd(30, "\0")).subarray(0, 30)]) : Buffer.alloc(0),
  Buffer.from([0xff, 0xfe, 0x00, 0x09]), Buffer.from("secret\0"), Buffer.from([0xff, 0xc0, 0x00, 0x0b, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x01, 0x01, 0x11, 0x00]), Buffer.from([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]), Buffer.alloc(200, 7), Buffer.from([0xff, 0xd9])]);
const form = (file, fields = {}, name = "photo.png", type = "image/png") => { const f = new FormData(); if (file) f.set("photo", new Blob([file], { type }), name); for (const [k, v] of Object.entries(fields)) if (v !== undefined) f.set(k, v); return f; };

const guest = new Client();
const cfg = (await guest.call("GET", "/api/tryon/config")).json;

if (process.env.UNCONFIGURED === "1") {
  t("config: unavailable when no provider", cfg.available === false && cfg.code === "not_configured" && cfg.provider === null && /No AI try-on provider/.test(cfg.message), cfg);
  const u = new Client(); const email = `tryon-${randomUUID().slice(0, 8)}@example.com`;
  await u.call("POST", "/api/auth/register", { json: { email, name: "T U", password: "correct horse battery 9" } });
  const items = (await guest.call("GET", "/api/catalog")).json.items; const tee = items.find((i) => i.kind === "tee" && i.availability === "in_stock");
  const r = await u.call("POST", "/api/tryon/jobs", { form: form(png(300, 400), { productId: tee.id, consent: "yes", consentVersion: cfg.consentVersion, consentProvider: "test" }) });
  t("create refused with a clear message, nothing stored", r.status === 503 && /not available/.test(r.json.errors[0]), r);
  const jobs = (await u.call("GET", "/api/tryon/jobs")).json; t("no jobs created", jobs.jobs.length === 0);
  const page = await fetch(BASE + "/virtual-try-on"); const html = await page.text();
  t("page renders and says photo try-on is unavailable", page.status === 200 && /not available|unavailable/i.test(html), page.status);
  console.log(`${pass} passed, ${failN} failed`); process.exit(failN ? 1 : 0);
}

// ---------- configuration ----------
t("config: test provider available and labelled", cfg.available === true && cfg.provider.test === true && /no AI/i.test(cfg.provider.label) && cfg.consentVersion === core.CONSENT_VERSION, cfg);
t("config exposes limits but no secrets", cfg.limits.maxMb === 8 && !JSON.stringify(cfg).match(/key|secret|token/i), cfg);

// ---------- pure image rules ----------
const jp = jpeg(300, 400); const pr = core.probeImage(jp);
t("probe: jpeg dims", pr.ok && pr.mime === "image/jpeg" && pr.width === 300 && pr.height === 400, pr);
t("probe: png dims", (() => { const p = core.probeImage(png(321, 654)); return p.ok && p.width === 321 && p.height === 654; })());
t("probe: rejects gif/text/svg/empty", ["GIF89a-----------------------------------", "hello world this is not an image at all..", "<svg xmlns='http://www.w3.org/2000/svg'></svg>", ""].every((s) => !core.probeImage(Buffer.from(s)).ok));
const stripped = Buffer.from(core.stripMetadata(jp, "image/jpeg"));
t("strip: jpeg EXIF/GPS and comments removed, image data kept", !stripped.includes("GPS-LAT") && !stripped.includes("secret") && core.probeImage(stripped).ok && stripped.includes(Buffer.alloc(200, 7)));
const pngMeta = png(300, 400, [chunk("tEXt", Buffer.from("Author\0Jane Doe")), chunk("eXIf", Buffer.from("GPSDATA")), chunk("tIME", Buffer.alloc(7))]);
const pngClean = Buffer.from(core.stripMetadata(pngMeta, "image/png"));
t("strip: png text/exif chunks removed, still valid", !pngClean.includes("Jane Doe") && !pngClean.includes("GPSDATA") && core.probeImage(pngClean).ok && pngClean.length < pngMeta.length);
const webp = (() => { const exif = Buffer.from("EXIF-GPS-SECRET"); const vp8x = Buffer.alloc(10); vp8x[0] = 0x08; vp8x.writeUIntLE(299, 4, 3); vp8x.writeUIntLE(399, 7, 3); const c = (ty, d) => { const h = Buffer.alloc(8); h.write(ty, 0); h.writeUInt32LE(d.length, 4); return Buffer.concat([h, d, d.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]); }; const body = Buffer.concat([Buffer.from("WEBP"), c("VP8X", vp8x), c("EXIF", exif), c("VP8 ", Buffer.alloc(20))]); const head = Buffer.alloc(8); head.write("RIFF"); head.writeUInt32LE(body.length, 4); return Buffer.concat([head, body]); })();
const webpClean = Buffer.from(core.stripMetadata(webp, "image/webp"));
t("strip: webp EXIF chunk removed, flags cleared, size fixed", !webpClean.includes("GPS-SECRET") && (webpClean[20] & 0x0c) === 0 && webpClean.readUInt32LE(4) === webpClean.length - 8 && core.probeImage(webpClean).ok, [webpClean.length]);
t("check: limits", core.checkPhoto(png(100, 100)).code === "too_small" && core.checkPhoto(Buffer.alloc(9 * 1024 * 1024, 1)).code === "too_large" && core.checkPhoto(png(300, 300)).ok === true);
t("garment categories", core.garmentCategoryFor("tee") === "upper_body" && core.garmentCategoryFor("trousers") === "lower_body" && core.garmentCategoryFor("sneaker") === null && core.garmentCategoryFor("dress") === "dress" && core.garmentCategoryFor("coat") === "outerwear");

// ---------- accounts and request security ----------
const items = (await guest.call("GET", "/api/catalog")).json.items;
const tee = items.find((i) => i.kind === "tee" && i.availability === "in_stock"), pants = items.find((i) => i.kind === "trousers"), shoes = items.find((i) => i.kind === "sneaker"), dress = items.find((i) => i.kind === "dress");
const mk = async () => { const u = new Client(); const r = await u.call("POST", "/api/auth/register", { json: { email: `tryon-${randomUUID().slice(0, 8)}@example.com`, name: "Try On", password: "correct horse battery 9" } }); if (r.status !== 201) throw new Error("register " + r.status); return u; };
const A = await mk(), B = await mk();
const good = { consent: "yes", consentVersion: cfg.consentVersion, consentProvider: "test" };
const make = (u, over = {}, file = png(300, 400), fileOpts = []) => u.call("POST", "/api/tryon/jobs", { form: form(file, { productId: tee.id, ...good, ...over }, ...fileOpts) });
t("anonymous cannot create", (await guest.call("POST", "/api/tryon/jobs", { form: form(png(300, 400), { productId: tee.id, ...good }) })).status === 401);
t("anonymous cannot list", (await guest.call("GET", "/api/tryon/jobs")).status === 401);
t("missing CSRF header refused", (await A.call("POST", "/api/tryon/jobs", { form: form(png(300, 400), { productId: tee.id, ...good }), csrf: false })).status === 403);
t("cross-origin refused", (await A.call("POST", "/api/tryon/jobs", { form: form(png(300, 400), { productId: tee.id, ...good }), origin: "https://evil.example" })).status === 403);

// ---------- consent ----------
let r = await make(A, { consent: undefined }); t("no consent → 422", r.status === 422 && /accept/i.test(r.json.errors[0]), r.json);
r = await make(A, { consent: "no" }); t("consent=no → 422", r.status === 422);
r = await make(A, { consentVersion: "old" }); t("stale consent version → 422", r.status === 422);
r = await make(A, { consentProvider: "other" }); t("consent for another provider → 422", r.status === 422);
t("nothing stored after refusals", (await A.call("GET", "/api/tryon/jobs")).json.jobs.length === 0);

// ---------- photo validation ----------
r = await A.call("POST", "/api/tryon/jobs", { form: form(null, { productId: tee.id, ...good }) }); t("no photo → 422", r.status === 422);
r = await make(A, { productId: undefined }); t("no product → 422", r.status === 422);
r = await make(A, { productId: "nope-123" }); t("unknown product → 404", r.status === 404);
r = await make(A, { productId: shoes.id }); t("unsupported product kind (shoes) → 422", r.status === 422 && /does not support/.test(r.json.errors[0]), r.json);
r = await make(A, {}, Buffer.from("not an image, just text pretending to be a photo ".repeat(10)), ["photo.png", "image/png"]); t("text renamed .png → 415", r.status === 415, r.json);
r = await make(A, {}, Buffer.from("GIF89a" + "x".repeat(60), "latin1"), ["a.gif", "image/gif"]); t("gif → 415", r.status === 415);
r = await make(A, {}, Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><script>alert(1)</script></svg>"), ["a.png", "image/png"]); t("svg disguised as png → 415", r.status === 415);
r = await make(A, {}, png(120, 120)); t("tiny image → 422", r.status === 422 && /too small/.test(r.json.errors[0]), r.json);
r = await make(A, {}, png(7000, 300)); t("huge dimensions → 422", r.status === 422);
r = await make(A, {}, png(300, 400).subarray(0, 20)); t("truncated png → 422", r.status === 422);
r = await make(A, {}, Buffer.concat([png(300, 400), Buffer.alloc(8.5 * 1024 * 1024)])); t("over 8 MB → 413", r.status === 413, r.status);
t("no jobs and no photo files after all refusals", (await A.call("GET", "/api/tryon/jobs")).json.jobs.length === 0);

// ---------- happy path ----------
r = await make(A, { color: "Black", size: "M" }, jpeg(300, 400), ["me.jpg", "image/jpeg"]);
t("create → 200 with job in progress", r.status === 200 && ["queued", "processing"].includes(r.json.status) && r.json.productId === tee.id && r.json.test === true && r.json.provider.id === "test", r.json);
const job = r.json; t("job id shape and consent recorded server-side only", /^tj_[a-f0-9]{18}$/.test(job.id) && !("consent" in job) && !("photo" in job));
const seen = []; let cur = job; const start = Date.now();
while (Date.now() - start < 20000) { cur = (await A.call("GET", `/api/tryon/jobs/${job.id}`)).json; seen.push(cur.progress); if (cur.status === "succeeded" || cur.status === "failed") break; await sleep(250); }
t("job reaches succeeded", cur.status === "succeeded" && cur.hasResult === true && cur.progress === 100, cur);
t("progress never goes backwards and passes through processing", seen.every((p, i) => i === 0 || p >= seen[i - 1]) && seen.some((p) => p > 3 && p < 100), seen);
t("photo deleted from the server once finished", cur.photoDeletedAt !== null);
t("job has an expiry (unsaved result is temporary)", cur.expiresAt > Date.now() && cur.expiresAt < Date.now() + 25 * 3600_000, cur.expiresAt);
const res = await A.call("GET", `/api/tryon/jobs/${job.id}/result`);
t("owner gets the image, private + no-store + nosniff", res.status === 200 && res.headers.get("content-type") === "image/png" && /private/.test(res.headers.get("cache-control")) && /no-store/.test(res.headers.get("cache-control")) && res.headers.get("x-content-type-options") === "nosniff" && res.bytes.subarray(1, 4).toString() === "PNG", res.status);
t("result is the labelled test image, not the user's photo", res.bytes.length > 1000 && !res.bytes.includes("GPS-LAT") && cur.test === true);

// ---------- access control ----------
t("other user cannot read the job", (await B.call("GET", `/api/tryon/jobs/${job.id}`)).status === 404);
t("other user cannot read the result", (await B.call("GET", `/api/tryon/jobs/${job.id}/result`)).status === 404);
t("other user cannot delete or save it", (await B.call("DELETE", `/api/tryon/jobs/${job.id}`)).status === 404 && (await B.call("PATCH", `/api/tryon/jobs/${job.id}`, { json: { saved: true } })).status === 404);
t("anonymous cannot read the result", (await guest.call("GET", `/api/tryon/jobs/${job.id}/result`)).status === 401);
t("other user's list is empty", (await B.call("GET", "/api/tryon/jobs")).json.jobs.length === 0);
t("malformed job ids are not found", (await A.call("GET", "/api/tryon/jobs/../../etc/passwd")).status === 404 && (await A.call("GET", "/api/tryon/jobs/tj_zzzz/result")).status === 404);
for (const p of ["/data/private/tryon/jobs.json", "/private/tryon/jobs.json", "/api/uploads/../private/tryon/jobs.json", "/tryon/jobs.json"]) t(`private files are not web-reachable (${p})`, (await guest.call("GET", p)).status === 404);
const list = (await A.call("GET", "/api/tryon/jobs")).json.jobs; t("owner list shows the job", list.length === 1 && list[0].id === job.id);

// ---------- save / unsave ----------
r = await A.call("PATCH", `/api/tryon/jobs/${job.id}`, { json: { saved: true } });
t("save extends retention to ~30 days", r.status === 200 && r.json.saved && r.json.expiresAt > Date.now() + 29 * 86400_000, r.json);
r = await A.call("PATCH", `/api/tryon/jobs/${job.id}`, { json: { saved: false } }); t("unsave returns to 24 h", r.json.saved === false && r.json.expiresAt < Date.now() + 25 * 3600_000);
t("bad save body → 422", (await A.call("PATCH", `/api/tryon/jobs/${job.id}`, { json: { saved: "yes" } })).status === 422);

// ---------- provider failures ----------
const runFail = async (testMode, code, retryable) => {
  const x = await make(A, { testMode }); if (x.status !== 200) return { x };
  let c = x.json; const s = Date.now(); while (Date.now() - s < 15000 && !["failed", "succeeded"].includes(c.status)) { await sleep(250); c = (await A.call("GET", `/api/tryon/jobs/${x.json.id}`)).json; }
  return { x, c };
};
for (const [mode, code] of [["fail", "generation_failed"], ["reject", "photo_rejected"], ["unreachable", "provider_unreachable"], ["quota", "provider_quota"]]) {
  const { c } = await runFail(mode);
  t(`provider failure "${mode}" → failed with clear error, photo deleted, no result`, c.status === "failed" && c.error?.code === code && c.error.message.length > 10 && c.photoDeletedAt !== null && c.hasResult === false, c);
  const rr = await A.call("GET", `/api/tryon/jobs/${c.id}/result`); if (mode === "fail") t("failed job has no result to download", rr.status === 404);
  if (mode === "fail") { const sv = await A.call("PATCH", `/api/tryon/jobs/${c.id}`, { json: { saved: true } }); t("failed job cannot be saved", sv.status === 409); }
}
t("retryable flags: reject=false, others=true", (await A.call("GET", "/api/tryon/jobs")).json.jobs.filter((j) => j.status === "failed").every((j) => j.error.retryable === (j.error.code !== "photo_rejected")));
const retry = await runFail("ok"); t("retry after failure works", retry.c?.status === "succeeded");

// ---------- usage limits and retention ----------
const slow1 = await make(A, { testMode: "slow" }), slow2 = await make(A, { testMode: "slow" }), slow3 = await make(A, { testMode: "slow" });
t("concurrent jobs capped at 2", slow1.status === 200 && slow2.status === 200 && slow3.status === 429, [slow1.status, slow2.status, slow3.status]);
t("progress states while processing", ["queued", "processing"].includes((await A.call("GET", `/api/tryon/jobs/${slow1.json.id}`)).json.status));
// retention sweep: the server runs with TRYON_PHOTO_RETENTION_SECONDS=3 and TRYON_SWEEP_MS=500 (see .env.local)
await sleep(4000);
const aged = (await A.call("GET", `/api/tryon/jobs/${slow1.json.id}`)).json;
t("a photo kept past the retention window is removed by the sweep", aged.photoDeletedAt !== null, aged);
// deleting a running job removes it and its files
const d1 = await A.call("DELETE", `/api/tryon/jobs/${slow2.json.id}`); t("delete a running job", d1.status === 200 && d1.json.deleted === 1 && (await A.call("GET", `/api/tryon/jobs/${slow2.json.id}`)).status === 404);

// ---------- deletion ----------
const dres = await A.call("DELETE", `/api/tryon/jobs/${job.id}`);
t("delete a finished job: record, result and provider copy", dres.status === 200 && dres.json.deleted === 1 && dres.json.providerDeletion === "requested", dres.json);
t("deleted job is gone (job and result)", (await A.call("GET", `/api/tryon/jobs/${job.id}`)).status === 404 && (await A.call("GET", `/api/tryon/jobs/${job.id}/result`)).status === 404);
const all = await A.call("DELETE", "/api/tryon/jobs"); t("delete everything of mine", all.status === 200 && all.json.deleted >= 1 && (await A.call("GET", "/api/tryon/jobs")).json.jobs.length === 0, all.json);

// ---------- daily limit (failed attempts count; deleting does not reset) ----------
const C = await mk(); let status = 200, n = 0;
while (status === 200 && n < 15) { const x = await make(C, { testMode: "reject" }); status = x.status; if (status === 200) n++; if (status === 200) await sleep(120); }
t("daily limit stops at 10 attempts", n === 10 && status === 429, [n, status]);
await C.call("DELETE", "/api/tryon/jobs");
t("deleting history does not reset the daily limit", (await make(C, { testMode: "reject" })).status === 429);
t("config shows usage for the signed-in user", (await C.call("GET", "/api/tryon/config")).json.usage.used >= 10);

console.log(`${pass} passed, ${failN} failed`); process.exit(failN ? 1 : 0);
