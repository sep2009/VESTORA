import "server-only";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { User } from "@/modules/commerce/types";
import { CONSENT_VERSION, PHOTO_LIMITS, RETENTION, checkPhoto, garmentCategoryFor, isActive, stripMetadata, type GarmentCategory, type JobStatus, type JobView } from "@/modules/tryon/core";
import { getCatalog } from "@/server/catalog/catalog";
import { kindForCategory } from "@/modules/catalog/kinds";
import { isDemo } from "@/modules/catalog/types";
import { fail, ok, type Result } from "@/server/store/db";
import { providerStatus } from "./providers";
import { TryOnProviderError, type TryOnProvider } from "./providers/provider";

/**
 * Try-on jobs. Photos live ONLY in a private directory (never under public/, never served by a static route) and are deleted as
 * soon as the provider is done, and in any case within RETENTION.photoMinutes. Results are served only to their owner.
 * Single-instance: jobs run inside this server process (a worker queue is needed to scale out; see docs/TRYON.md).
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
type Data = { jobs: JobRecord[]; usage: { userId: string; at: number }[] };

const privateDir = () => path.join(process.env.VESTORA_PRIVATE_DIR ?? path.join(process.cwd(), "data", "private"), "tryon");
const jobsFile = () => path.join(privateDir(), "jobs.json");
const DAY = 86_400_000;
export const limits = () => ({ daily: Math.max(1, Number(process.env.TRYON_DAILY_LIMIT) || 10), concurrent: 2 });

// ---------- tiny serialised file store ----------
let queue: Promise<unknown> = Promise.resolve();
function read(): Data {
  try { const d = JSON.parse(readFileSync(jobsFile(), "utf8")) as Partial<Data>; return { jobs: d.jobs ?? [], usage: d.usage ?? [] }; } catch { return { jobs: [], usage: [] }; }
}
function write(d: Data) {
  mkdirSync(privateDir(), { recursive: true, mode: 0o700 });
  const tmp = `${jobsFile()}.${randomBytes(4).toString("hex")}.tmp`;
  writeFileSync(tmp, JSON.stringify(d), { mode: 0o600 }); renameSync(tmp, jobsFile());
}
function update<T>(fn: (d: Data) => T): Promise<T> {
  const run = async () => { const d = read(); const r = fn(d); write(d); return r; };
  const next = queue.then(run, run); queue = next.catch(() => undefined); return next;
}
const filePath = (name: string) => path.join(privateDir(), name);
const removeFile = (name: string | undefined) => { if (name && /^[a-f0-9]{24}\.(bin|png|jpg|webp)$/.test(name)) { try { rmSync(filePath(name), { force: true }); } catch { /* already gone */ } } };
const saveFile = (bytes: Uint8Array, ext: string, mode = 0o600) => { mkdirSync(privateDir(), { recursive: true, mode: 0o700 }); const name = `${randomBytes(12).toString("hex")}.${ext}`; writeFileSync(filePath(name), bytes, { mode, flag: "wx" }); return name; };

const runners: Set<string> = ((globalThis as unknown as { __tryonRunners?: Set<string> }).__tryonRunners ??= new Set());

export function view(j: JobRecord): JobView {
  return {
    id: j.id, productId: j.productId, sku: j.sku, color: j.color, size: j.size, category: j.category, status: j.status, progress: j.progress, stage: j.stage,
    provider: { id: j.providerId, label: j.providerLabel, test: j.test }, error: j.error, createdAt: j.createdAt, updatedAt: j.updatedAt,
    photoDeletedAt: j.photo.deletedAt, hasResult: !!j.result, saved: j.saved, expiresAt: j.expiresAt, test: j.test,
  };
}

/** Files that no job refers to (a crash or a race) are removed once they are a few minutes old. */
function removeOrphans(d: Data, now: number) {
  try {
    const keep = new Set(d.jobs.flatMap((j) => [j.photo.file, j.result?.file ?? ""]));
    for (const f of readdirSync(privateDir())) if (/^[a-f0-9]{24}\.(bin|png|jpg|webp)$/.test(f) && !keep.has(f) && now - statSync(filePath(f)).mtimeMs > 5 * 60_000) removeFile(f);
  } catch { /* directory may not exist yet */ }
}

/** Housekeeping on every call: remove photos kept too long, fail abandoned jobs, drop expired results, prune the usage log. */
export async function sweep(now = Date.now()): Promise<void> {
  const d = read();
  removeOrphans(d, now);
  const dirty = d.jobs.some((j) => (j.photo.deletedAt === null && (now - j.createdAt > RETENTION.photoMinutes * 60_000 || !isActive(j.status))) || (j.expiresAt !== null && j.expiresAt < now) || (isActive(j.status) && !runners.has(j.id) && now - j.updatedAt > RETENTION.staleJobMinutes * 60_000) || (j.status === "failed" && now - j.updatedAt > DAY)) || d.usage.some((u) => now - u.at > DAY);
  if (!dirty) return;
  await update((x) => {
    x.usage = x.usage.filter((u) => now - u.at <= DAY);
    x.jobs = x.jobs.filter((j) => {
      if (isActive(j.status) && !runners.has(j.id) && now - j.updatedAt > RETENTION.staleJobMinutes * 60_000) { j.status = "failed"; j.stage = "failed"; j.error = { code: "interrupted", message: "This try-on was interrupted. Please upload your photo again.", retryable: true }; j.updatedAt = now; }
      if (j.photo.deletedAt === null && (now - j.createdAt > RETENTION.photoMinutes * 60_000 || !isActive(j.status))) { removeFile(j.photo.file); j.photo.deletedAt = now; }
      if (j.expiresAt !== null && j.expiresAt < now) { removeFile(j.photo.file); removeFile(j.result?.file); return false; }
      if (j.status === "failed" && now - j.updatedAt > DAY) return false;
      return true;
    });
  });
}

export type CreateInput = { productId: string; sku: string | null; color: string | null; size: string | null; photo: Uint8Array; consent: { accepted: boolean; version: string; providerId: string }; testMode?: string | null; origin: string };

export async function createJob(user: User, input: CreateInput): Promise<Result<JobView>> {
  const st = providerStatus();
  if (!st.available) return fail(503, "AI photo try-on is not available: " + st.message);
  const provider = st.provider;
  if (!input.consent.accepted || input.consent.version !== CONSENT_VERSION || input.consent.providerId !== provider.id) return fail(422, "Please read and accept the photo processing terms before uploading.");
  await sweep();
  const cat = getCatalog();
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
  const now = Date.now(), lim = limits();
  const id = `tj_${randomBytes(9).toString("hex")}`;
  const photoFile = saveFile(clean, "bin");
  const r = await update((d): Result<JobRecord> => {
    const mine = d.jobs.filter((j) => j.userId === user.id && isActive(j.status)).length;
    if (mine >= lim.concurrent) return fail(429, "You already have try-ons in progress. Please wait for them to finish.");
    if (d.usage.filter((u) => u.userId === user.id && now - u.at <= DAY).length >= lim.daily) return fail(429, `You have reached today’s limit of ${lim.daily} AI try-ons. Please try again tomorrow.`);
    const job: JobRecord = {
      id, userId: user.id, productId: product.id, sku, color: input.color?.slice(0, 40) ?? null, size: input.size?.slice(0, 20) ?? null, category,
      providerId: provider.id, providerLabel: provider.label, test: provider.test, status: "queued", progress: 3, stage: "queued", error: null, createdAt: now, updatedAt: now,
      consent: { version: input.consent.version, at: now, providerId: provider.id },
      photo: { mime: check.mime, bytes: clean.length, width: check.width, height: check.height, file: photoFile, deletedAt: null }, result: null, providerJobId: null, saved: false, expiresAt: null,
    };
    d.jobs.push(job); d.usage.push({ userId: user.id, at: now });
    return ok(job);
  });
  if (!r.ok) { removeFile(photoFile); return r; }
  const garmentUrl = product.images[0].url;
  runners.add(id);
  void runJob(id, provider, { productId: product.id, name: product.name, category, imageUrl: garmentUrl.startsWith("/") ? input.origin + garmentUrl : garmentUrl }, input.testMode && provider.test ? input.testMode : undefined)
    .catch((e) => console.error("[tryon] job crashed", id, e instanceof Error ? e.message : e)).finally(() => runners.delete(id));
  return ok(view(r.data));
}

const patch = (id: string, fn: (j: JobRecord) => void) => update((d) => { const j = d.jobs.find((x) => x.id === id); if (j) { fn(j); j.updatedAt = Date.now(); } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const POLL_MS = () => Number(process.env.TRYON_POLL_MS) || 1000;
const TIMEOUT_MS = () => Number(process.env.TRYON_TIMEOUT_MS) || 120_000;

async function runJob(id: string, provider: TryOnProvider, garment: { productId: string; name: string; category: GarmentCategory; imageUrl: string }, testMode?: string) {
  const finishFail = async (code: string, message: string, retryable: boolean) => patch(id, (j) => {
    j.status = "failed"; j.stage = "failed"; j.progress = 100; j.error = { code, message, retryable };
    removeFile(j.photo.file); j.photo.deletedAt = Date.now(); // the photo is not kept after a failure
  });
  let providerJobId: string | null = null;
  try {
    const job = read().jobs.find((j) => j.id === id); if (!job) return;
    await patch(id, (j) => { j.status = "processing"; j.stage = "uploading"; j.progress = 12; });
    const bytes = new Uint8Array(readFileSync(filePath(job.photo.file)));
    providerJobId = (await provider.submit({ jobId: id, photo: { bytes, mime: job.photo.mime as "image/jpeg" }, garment, testMode })).providerJobId;
    await patch(id, (j) => { j.providerJobId = providerJobId; j.stage = "processing"; j.progress = 20; });
    const deadline = Date.now() + TIMEOUT_MS();
    for (;;) {
      if (!read().jobs.some((j) => j.id === id)) { if (providerJobId) await provider.delete?.(providerJobId).catch(() => undefined); return; } // deleted by the shopper meanwhile
      const p = await provider.poll(providerJobId);
      if (p.state === "processing") { await patch(id, (j) => { j.progress = Math.max(j.progress, Math.min(90, 20 + Math.round((p.progress ?? 0) * 0.7))); }); }
      else if (p.state === "failed") { await finishFail(p.code, p.message, p.retryable); break; }
      else {
        const img = checkResult(p.image.bytes);
        if (!img) { await finishFail("bad_result", "The service returned something that is not a usable image.", true); break; }
        await patch(id, (j) => { j.stage = "finishing"; j.progress = 95; });
        const file = saveFile(p.image.bytes, img.ext);
        if (!read().jobs.some((j) => j.id === id)) { removeFile(file); return; } // deleted while the image arrived: leave nothing behind
        await patch(id, (j) => {
          j.result = { mime: img.mime, bytes: p.image.bytes.length, file }; j.status = "succeeded"; j.stage = "done"; j.progress = 100; j.expiresAt = Date.now() + RETENTION.resultHours * 3_600_000;
          removeFile(j.photo.file); j.photo.deletedAt = Date.now();
        });
        break;
      }
      if (Date.now() > deadline) { await finishFail("timeout", "The service took too long. Please try again.", true); break; }
      await sleep(POLL_MS());
    }
  } catch (e) {
    if (e instanceof TryOnProviderError) await finishFail(e.code, e.message, e.retryable);
    else { console.error("[tryon] unexpected", e instanceof Error ? e.message : e); await finishFail("internal", "Something went wrong while creating your image.", true); }
  } finally {
    if (providerJobId) { try { await provider.delete?.(providerJobId); } catch { /* provider cleanup is best effort */ } }
  }
}

/** Results must be real images (PNG, JPEG or WebP) of a sane size, whatever the provider claims. */
function checkResult(b: Uint8Array): { ext: string; mime: string } | null {
  if (b.length === 0 || b.length > 12 * 1024 * 1024) return null;
  const s = (o: number, t: string) => t.split("").every((c, i) => b[o + i] === c.charCodeAt(0));
  if (b[0] === 0x89 && s(1, "PNG")) return { ext: "png", mime: "image/png" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (s(0, "RIFF") && s(8, "WEBP")) return { ext: "webp", mime: "image/webp" };
  return null;
}

// ---------- owner-scoped access (a job that is not yours does not exist) ----------
export async function listJobs(user: User): Promise<JobView[]> { await sweep(); return read().jobs.filter((j) => j.userId === user.id).sort((a, b) => b.createdAt - a.createdAt).map(view); }
export async function getJob(user: User, id: string): Promise<JobView | null> { await sweep(); const j = read().jobs.find((x) => x.id === id && x.userId === user.id); return j ? view(j) : null; }
export async function readResult(user: User, id: string): Promise<{ bytes: Buffer; mime: string } | null> {
  await sweep();
  const j = read().jobs.find((x) => x.id === id && x.userId === user.id);
  if (!j?.result || j.status !== "succeeded") return null;
  try { return { bytes: readFileSync(filePath(j.result.file)), mime: j.result.mime }; } catch { return null; }
}
export async function setSaved(user: User, id: string, saved: boolean): Promise<Result<JobView>> {
  return update((d) => {
    const j = d.jobs.find((x) => x.id === id && x.userId === user.id);
    if (!j) return fail(404, "Result not found.");
    if (j.status !== "succeeded") return fail(409, "Only finished results can be saved.");
    j.saved = saved; j.expiresAt = Date.now() + (saved ? RETENTION.savedDays * DAY : RETENTION.resultHours * 3_600_000); j.updatedAt = Date.now();
    return ok(view(j));
  });
}
/** Delete a try-on completely: the photo (if still held), the generated image, the record, and ask the provider to delete its copy. */
export async function deleteJobs(user: User, id: string | null): Promise<{ deleted: number; providerDeletion: "requested" | "not_supported" | "none" }> {
  const taken = await update((d) => { const gone = d.jobs.filter((j) => j.userId === user.id && (id === null || j.id === id)); d.jobs = d.jobs.filter((j) => !gone.includes(j)); gone.forEach((j) => { removeFile(j.photo.file); removeFile(j.result?.file); }); return gone; });
  const st = providerStatus(); let provider: "requested" | "not_supported" | "none" = "none";
  for (const j of taken) {
    if (!j.providerJobId) continue;
    if (st.available && st.provider.id === j.providerId && st.provider.delete) { provider = "requested"; await st.provider.delete(j.providerJobId).catch(() => undefined); } else if (provider === "none") provider = "not_supported";
  }
  return { deleted: taken.length, providerDeletion: provider };
}
export const photoDir = privateDir; // for tests and docs only
export const _exists = (name: string) => existsSync(filePath(name));
export { PHOTO_LIMITS };
export function usageFor(user: User): { used: number; limit: number } { const now = Date.now(); return { used: read().usage.filter((u) => u.userId === user.id && now - u.at <= DAY).length, limit: limits().daily }; }
