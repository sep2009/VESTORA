import "server-only";
import { randomBytes } from "node:crypto";
import type { User } from "@/modules/commerce/types";
import { CONSENT_VERSION, PHOTO_LIMITS, RETENTION, checkPhoto, garmentCategoryFor, isActive, stripMetadata, type GarmentCategory, type JobStatus, type JobView } from "@/modules/tryon/core";
import { getCatalog } from "@/server/catalog/catalog";
import { kindForCategory } from "@/modules/catalog/kinds";
import { isDemo } from "@/modules/catalog/types";
import { fail, ok, ready, type Result } from "@/server/store/db";
import type { Queryable } from "@/server/db/driver";
import { providerStatus } from "./providers";
import { TryOnProviderError } from "./providers/provider";

/**
 * Try-on jobs. Photos and results live ONLY in the private database table `private_files` (never served by a static route) and are deleted as
 * soon as the provider is done, and in any case within the photo retention window. Results are served only to their owner.
 * Serverless-safe: nothing runs in the background. The job is submitted to the provider during the request that creates it, and every status
 * request advances it (polls the provider once and records the outcome), so it works on any number of short-lived instances.
 */
type JobRecord = {
  id: string; userId: string; productId: string; sku: string | null; color: string | null; size: string | null; category: GarmentCategory;
  providerId: string; providerLabel: string; test: boolean;
  status: JobStatus; progress: number; stage: string; error: { code: string; message: string; retryable: boolean } | null;
  createdAt: number; updatedAt: number;
  consent: { version: string; at: number; providerId: string };
  photo: { mime: string; bytes: number; width: number; height: number; file: string; deletedAt: number | null };
  result: { mime: string; bytes: number; file: string } | null;
  providerJobId: string | null; saved: boolean; expiresAt: number | null;
};

const DAY = 86_400_000;
export const limits = () => ({ daily: Math.max(1, Number(process.env.TRYON_DAILY_LIMIT) || 10), concurrent: 2 });
const photoMs = () => (Number(process.env.TRYON_PHOTO_RETENTION_SECONDS) > 0 ? Number(process.env.TRYON_PHOTO_RETENTION_SECONDS) * 1000 : RETENTION.photoMinutes * 60_000);
const POLL_MS = () => Number(process.env.TRYON_POLL_MS) || 1000;
const TIMEOUT_MS = () => Number(process.env.TRYON_TIMEOUT_MS) || 120_000;
const LOCK = 7_000_010;

// ---------- storage (PostgreSQL) ----------
const rec = (r: { data: JobRecord }) => r.data;
async function tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T> { const db = await ready(); return db.transaction(async (q) => { await q.query("select pg_advisory_xact_lock($1)", [LOCK]); return fn(q); }); }
const put = (q: Queryable, j: JobRecord) => q.query("insert into tryon_jobs (id, user_id, status, created_at, data) values ($1, $2, $3, $4, $5::jsonb) on conflict (id) do update set status = excluded.status, data = excluded.data", [j.id, j.userId, j.status, j.createdAt, JSON.stringify(j)]);
const getRec = async (q: Queryable, id: string) => { const r = (await q.query<{ data: JobRecord }>("select data from tryon_jobs where id = $1", [id])).rows[0]; return r ? rec(r) : null; };
const saveFile = async (q: Queryable, owner: string, bytes: Uint8Array, mime: string, ext: string) => { const name = `${randomBytes(12).toString("hex")}.${ext}`; await q.query("insert into private_files (name, owner, mime, bytes) values ($1, $2, $3, $4)", [name, owner, mime, Buffer.from(bytes)]); return name; };
const removeFile = async (q: Queryable, name: string | undefined) => { if (name) await q.query("delete from private_files where name = $1", [name]); };
async function patch(id: string, fn: (j: JobRecord) => void | Promise<void>): Promise<void> {
  await tx(async (q) => { const j = await getRec(q, id); if (!j) return; await fn(j); j.updatedAt = Date.now(); await put(q, j); });
}

export function view(j: JobRecord): JobView {
  return {
    id: j.id, productId: j.productId, sku: j.sku, color: j.color, size: j.size, category: j.category, status: j.status, progress: j.progress, stage: j.stage,
    provider: { id: j.providerId, label: j.providerLabel, test: j.test }, error: j.error, createdAt: j.createdAt, updatedAt: j.updatedAt,
    photoDeletedAt: j.photo.deletedAt, hasResult: !!j.result, saved: j.saved, expiresAt: j.expiresAt, test: j.test,
  };
}

let lastSweep = 0;
/** Housekeeping: remove photos kept too long, fail abandoned jobs, drop expired results, prune the usage log. Throttled to once every 20 s per instance (and always for a forced call). */
export async function sweep(force = false, now = Date.now()): Promise<void> {
  if (!force && now - lastSweep < (Number(process.env.TRYON_SWEEP_MS) || 20_000)) return;
  lastSweep = now;
  await tx(async (q) => {
    await q.query("delete from tryon_usage where at < $1", [now - DAY]);
    const jobs = (await q.query<{ data: JobRecord }>("select data from tryon_jobs")).rows.map(rec);
    for (const j of jobs) {
      let dirty = false;
      if (isActive(j.status) && now - j.updatedAt > RETENTION.staleJobMinutes * 60_000) { j.status = "failed"; j.stage = "failed"; j.error = { code: "interrupted", message: "This try-on was interrupted. Please upload your photo again.", retryable: true }; dirty = true; }
      if (j.photo.deletedAt === null && (now - j.createdAt > photoMs() || !isActive(j.status))) { await removeFile(q, j.photo.file); j.photo.deletedAt = now; dirty = true; }
      if ((j.expiresAt !== null && j.expiresAt < now) || (j.status === "failed" && now - j.updatedAt > DAY)) { await removeFile(q, j.photo.file); await removeFile(q, j.result?.file); await q.query("delete from tryon_jobs where id = $1", [j.id]); continue; }
      if (dirty) { j.updatedAt = now; await put(q, j); }
    }
    // files nobody refers to (an interrupted request) are removed after a few minutes
    await q.query("delete from private_files where created_at < now() - interval '10 minutes' and not exists (select 1 from tryon_jobs t where t.data->'photo'->>'file' = private_files.name or t.data->'result'->>'file' = private_files.name)");
  });
}

export type CreateInput = { productId: string; sku: string | null; color: string | null; size: string | null; photo: Uint8Array; consent: { accepted: boolean; version: string; providerId: string }; testMode?: string | null; origin: string };

export async function createJob(user: User, input: CreateInput): Promise<Result<JobView>> {
  const st = providerStatus();
  if (!st.available) return fail(503, "AI photo try-on is not available: " + st.message);
  const provider = st.provider;
  if (!input.consent.accepted || input.consent.version !== CONSENT_VERSION || input.consent.providerId !== provider.id) return fail(422, "Please read and accept the photo processing terms before uploading.");
  await sweep();
  const cat = await getCatalog();
  const product = cat.products.find((p) => p.id === input.productId);
  if (!product) return fail(404, "That product was not found.");
  const category = garmentCategoryFor(kindForCategory(cat.categories, product.category));
  if (!category) return fail(422, "AI photo try-on does not support this kind of product (it supports tops, bottoms, dresses and jackets).");
  if (!provider.supports.includes(category)) return fail(422, "The configured service does not support this garment category.");
  if (!product.images[0]) return fail(422, "This product has no picture to try on.");
  if (isDemo(product) && !provider.test) return fail(422, "Demo products have no real garment photo, so AI photo try-on is not offered for them.");
  const check = checkPhoto(input.photo);
  if (!check.ok) return fail(check.code === "too_large" ? 413 : check.code === "type" ? 415 : 422, check.message);
  const sku = input.sku && product.variants.some((v) => v.sku === input.sku) ? input.sku : null;
  const clean = stripMetadata(input.photo, check.mime);
  const now = Date.now(), lim = limits(), id = `tj_${randomBytes(9).toString("hex")}`;
  const r = await tx(async (q): Promise<Result<JobRecord>> => {
    const mine = Number((await q.query<{ n: string }>("select count(*) as n from tryon_jobs where user_id = $1 and status in ('queued','processing')", [user.id])).rows[0]!.n);
    if (mine >= lim.concurrent) return fail(429, "You already have try-ons in progress. Please wait for them to finish.");
    const used = Number((await q.query<{ n: string }>("select count(*) as n from tryon_usage where user_id = $1 and at > $2", [user.id, now - DAY])).rows[0]!.n);
    if (used >= lim.daily) return fail(429, `You have reached today’s limit of ${lim.daily} AI try-ons. Please try again tomorrow.`);
    const photoFile = await saveFile(q, user.id, clean, check.mime, "bin");
    const job: JobRecord = {
      id, userId: user.id, productId: product.id, sku, color: input.color?.slice(0, 40) ?? null, size: input.size?.slice(0, 20) ?? null, category,
      providerId: provider.id, providerLabel: provider.label, test: provider.test, status: "queued", progress: 3, stage: "queued", error: null, createdAt: now, updatedAt: now,
      consent: { version: input.consent.version, at: now, providerId: provider.id },
      photo: { mime: check.mime, bytes: clean.length, width: check.width, height: check.height, file: photoFile, deletedAt: null }, result: null, providerJobId: null, saved: false, expiresAt: null,
    };
    await put(q, job); await q.query("insert into tryon_usage (user_id, at) values ($1, $2)", [user.id, now]);
    return ok(job);
  });
  if (!r.ok) return r;
  // hand the job to the provider now, inside this request
  const garmentUrl = product.images[0].url, testMode = input.testMode && provider.test ? input.testMode : undefined;
  try {
    await patch(id, (j) => { j.status = "processing"; j.stage = "uploading"; j.progress = 12; });
    const bytes = clean;
    const sub = await provider.submit({ jobId: id, photo: { bytes, mime: check.mime }, garment: { productId: product.id, name: product.name, category, imageUrl: garmentUrl.startsWith("/") ? input.origin + garmentUrl : garmentUrl }, testMode });
    await patch(id, (j) => { j.providerJobId = sub.providerJobId; j.stage = "processing"; j.progress = 20; });
  } catch (e) { await failJob(id, e); }
  return ok(view((await tx((q) => getRec(q, id))) ?? r.data));
}

async function failJob(id: string, e: unknown) {
  const code = e instanceof TryOnProviderError ? e.code : "internal", message = e instanceof TryOnProviderError ? e.message : "Something went wrong while creating your image.", retryable = e instanceof TryOnProviderError ? e.retryable : true;
  if (!(e instanceof TryOnProviderError)) console.error("[tryon] unexpected", e instanceof Error ? e.message : e);
  await finishFail(id, code, message, retryable);
}
const finishFail = (id: string, code: string, message: string, retryable: boolean) => tx(async (q) => {
  const j = await getRec(q, id); if (!j) return;
  j.status = "failed"; j.stage = "failed"; j.progress = 100; j.error = { code, message, retryable };
  await removeFile(q, j.photo.file); j.photo.deletedAt = Date.now(); j.updatedAt = Date.now(); await put(q, j);
});

/** Results must be real images (PNG, JPEG or WebP) of a sane size, whatever the provider claims. */
function checkResult(b: Uint8Array): { ext: string; mime: string } | null {
  if (b.length === 0 || b.length > 12 * 1024 * 1024) return null;
  const s = (o: number, t: string) => t.split("").every((c, i) => b[o + i] === c.charCodeAt(0));
  if (b[0] === 0x89 && s(1, "PNG")) return { ext: "png", mime: "image/png" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (s(0, "RIFF") && s(8, "WEBP")) return { ext: "webp", mime: "image/webp" };
  return null;
}

/** Ask the provider about an unfinished job (at most once per POLL_MS) and record the outcome. Called by every status request. */
async function advance(id: string): Promise<void> {
  const st = providerStatus(); if (!st.available) return;
  const provider = st.provider;
  await tx(async (q) => {
    const j = await getRec(q, id); if (!j || !isActive(j.status) || !j.providerJobId) return;
    if (j.providerId !== provider.id) return;
    const now = Date.now(); if (now - j.updatedAt < POLL_MS()) return;
    if (now - j.createdAt > TIMEOUT_MS()) { j.status = "failed"; j.stage = "failed"; j.progress = 100; j.error = { code: "timeout", message: "The service took too long. Please try again.", retryable: true }; await removeFile(q, j.photo.file); j.photo.deletedAt = now; j.updatedAt = now; await put(q, j); return; }
    let p;
    try { p = await provider.poll(j.providerJobId); }
    catch (e) { const code = e instanceof TryOnProviderError ? e.code : "provider_error", msg = e instanceof TryOnProviderError ? e.message : "The service could not be reached."; if (e instanceof TryOnProviderError && !e.retryable) { j.status = "failed"; j.stage = "failed"; j.progress = 100; j.error = { code, message: msg, retryable: false }; await removeFile(q, j.photo.file); j.photo.deletedAt = now; } j.updatedAt = now; await put(q, j); return; }
    j.updatedAt = now;
    if (p.state === "processing") { j.progress = Math.max(j.progress, Math.min(90, 20 + Math.round((p.progress ?? 0) * 0.7))); j.stage = "processing"; }
    else if (p.state === "failed") { j.status = "failed"; j.stage = "failed"; j.progress = 100; j.error = { code: p.code, message: p.message, retryable: p.retryable }; await removeFile(q, j.photo.file); j.photo.deletedAt = now; }
    else {
      const img = checkResult(p.image.bytes);
      if (!img) { j.status = "failed"; j.stage = "failed"; j.progress = 100; j.error = { code: "bad_result", message: "The service returned something that is not a usable image.", retryable: true }; }
      else { const file = await saveFile(q, j.userId, p.image.bytes, img.mime, img.ext); j.result = { mime: img.mime, bytes: p.image.bytes.length, file }; j.status = "succeeded"; j.stage = "done"; j.progress = 100; j.expiresAt = now + RETENTION.resultHours * 3_600_000; }
      await removeFile(q, j.photo.file); j.photo.deletedAt = now;
    }
    await put(q, j);
    if (j.status !== "processing" && j.providerJobId) { try { await provider.delete?.(j.providerJobId); } catch { /* provider cleanup is best effort */ } }
  });
}

// ---------- owner-scoped access (a job that is not yours does not exist) ----------
const mineActive = async (userId: string, id?: string) => { const db = await ready(); const r = await db.query<{ id: string }>("select id from tryon_jobs where user_id = $1 and status in ('queued','processing')" + (id ? " and id = $2" : ""), id ? [userId, id] : [userId]); return r.rows.map((x) => x.id); };
export async function listJobs(user: User): Promise<JobView[]> {
  await sweep(); for (const id of await mineActive(user.id)) await advance(id);
  const db = await ready();
  return (await db.query<{ data: JobRecord }>("select data from tryon_jobs where user_id = $1 order by created_at desc", [user.id])).rows.map((r) => view(rec(r)));
}
export async function getJob(user: User, id: string): Promise<JobView | null> {
  await sweep(); for (const a of await mineActive(user.id, id)) await advance(a);
  const db = await ready();
  const r = (await db.query<{ data: JobRecord }>("select data from tryon_jobs where id = $1 and user_id = $2", [id, user.id])).rows[0];
  return r ? view(rec(r)) : null;
}
export async function readResult(user: User, id: string): Promise<{ bytes: Buffer; mime: string } | null> {
  await sweep();
  const db = await ready();
  const j = (await db.query<{ data: JobRecord }>("select data from tryon_jobs where id = $1 and user_id = $2", [id, user.id])).rows[0]?.data;
  if (!j?.result || j.status !== "succeeded") return null;
  const f = (await db.query<{ bytes: Buffer; mime: string }>("select bytes, mime from private_files where name = $1 and owner = $2", [j.result.file, user.id])).rows[0];
  return f ? { bytes: Buffer.from(f.bytes), mime: f.mime } : null;
}
export async function setSaved(user: User, id: string, saved: boolean): Promise<Result<JobView>> {
  return tx(async (q): Promise<Result<JobView>> => {
    const j = await getRec(q, id);
    if (!j || j.userId !== user.id) return fail(404, "Result not found.");
    if (j.status !== "succeeded") return fail(409, "Only finished results can be saved.");
    j.saved = saved; j.expiresAt = Date.now() + (saved ? RETENTION.savedDays * DAY : RETENTION.resultHours * 3_600_000); j.updatedAt = Date.now();
    await put(q, j); return ok(view(j));
  });
}
/** Delete a try-on completely: the photo (if still held), the generated image, the record, and ask the provider to delete its copy. */
export async function deleteJobs(user: User, id: string | null): Promise<{ deleted: number; providerDeletion: "requested" | "not_supported" | "none" }> {
  const taken = await tx(async (q) => {
    const rows = (await q.query<{ data: JobRecord }>("select data from tryon_jobs where user_id = $1" + (id ? " and id = $2" : ""), id ? [user.id, id] : [user.id])).rows.map(rec);
    for (const j of rows) { await removeFile(q, j.photo.file); await removeFile(q, j.result?.file); await q.query("delete from tryon_jobs where id = $1", [j.id]); }
    return rows;
  });
  const st = providerStatus(); let provider: "requested" | "not_supported" | "none" = "none";
  for (const j of taken) {
    if (!j.providerJobId) continue;
    if (st.available && st.provider.id === j.providerId && st.provider.delete) { provider = "requested"; await st.provider.delete(j.providerJobId).catch(() => undefined); } else if (provider === "none") provider = "not_supported";
  }
  return { deleted: taken.length, providerDeletion: provider };
}
export async function usageFor(user: User): Promise<{ used: number; limit: number }> {
  const db = await ready();
  const n = Number((await db.query<{ n: string }>("select count(*) as n from tryon_usage where user_id = $1 and at > $2", [user.id, Date.now() - DAY])).rows[0]!.n);
  return { used: n, limit: limits().daily };
}
export { PHOTO_LIMITS };
