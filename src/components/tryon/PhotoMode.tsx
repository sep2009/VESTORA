"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CONSENT_POINTS, STAGE_TEXT, checkPhoto, isActive, type JobView } from "@/modules/tryon/core";
import type { Pick } from "@/modules/outfit/core";
import type { TryOnItem } from "@/server/catalog/tryon-items";
import { useToasts } from "@/stores/toast-store";
import { call, type TryOnConfig } from "./tryon-client";

const btn = "min-h-10 rounded-sm border border-line bg-surface px-3 text-sm hover:border-ink disabled:opacity-40";
const fmtTime = (ms: number) => new Date(ms).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

export function PhotoMode({ config, item, pick, items }: { config: TryOnConfig; item: TryOnItem | null; pick: Pick | null; items: TryOnItem[] }) {
  const push = useToasts((s) => s.push);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // ---- not available: say so plainly and offer the working modes. No upload UI is shown. ----
  if (!config.available) return (
    <div className="rounded-md border border-dashed border-line bg-surface p-5" role="status" data-testid="photo-unavailable">
      <p className="text-lg font-medium">AI photo try-on is not available</p>
      <p className="mt-2 text-sm text-mute">{config.message}</p>
      <div className="mt-4 rounded-sm bg-paper p-3 text-sm leading-relaxed">
        <p className="font-medium">What it needs</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-mute">
          <li>A virtual try-on service chosen for Vestora, with an account and API credentials.</li>
          <li>An adapter written from that service’s official documentation (one file; see <code>docs/TRYON.md</code>).</li>
          <li>The server settings <code>TRYON_PROVIDER</code> and the service’s credentials, and a privacy review of the service’s terms.</li>
        </ul>
      </div>
      <p className="mt-4 text-sm text-mute">Nothing is uploaded and no result is faked. <strong className="font-medium text-ink">Avatar preview</strong> and <strong className="font-medium text-ink">3D garment preview</strong> work without it.</p>
    </div>
  );
  if (!config.signedIn) return (
    <div className="rounded-md border border-line bg-surface p-5" data-testid="photo-signin">
      <p className="text-lg font-medium">Sign in to use AI photo try-on</p>
      <p className="mt-2 text-sm text-mute">Photo try-on is tied to your account so that only you can see or delete your photo and results.</p>
      <Link href="/account?next=/virtual-try-on%3Fmode%3Dphoto" className="mt-4 inline-flex min-h-11 items-center rounded-sm bg-ink px-5 text-sm font-medium uppercase tracking-[0.12em] text-paper">Sign in or create an account</Link>
    </div>
  );
  return <PhotoFlow config={config} item={item} pick={pick} byId={byId} push={push} />;
}

function PhotoFlow({ config, item, pick, byId, push }: { config: TryOnConfig; item: TryOnItem | null; pick: Pick | null; byId: Map<string, TryOnItem>; push: (m: string, t?: "info" | "success" | "error") => void }) {
  const provider = config.provider!;
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState<string | null>(null), [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobView[]>([]), [currentId, setCurrentId] = useState<string | null>(null);
  const [cmp, setCmp] = useState<string[]>([]);
  const [testMode, setTestMode] = useState("ok");
  const input = useRef<HTMLInputElement>(null);
  const current = jobs.find((j) => j.id === currentId) ?? null;

  const [usage, setUsage] = useState(config.usage);
  const refreshUsage = useCallback(async () => { const r = await call<TryOnConfig>("GET", "/api/tryon/config"); if (r.ok) setUsage(r.data.usage); }, []);
  const refresh = useCallback(async () => { const r = await call<{ jobs: JobView[] }>("GET", "/api/tryon/jobs"); if (r.ok) setJobs(r.data.jobs); }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  // follow a running job
  useEffect(() => {
    if (!current || !isActive(current.status)) return;
    const t = setInterval(async () => { const r = await call<JobView>("GET", `/api/tryon/jobs/${current.id}`); if (r.ok) setJobs((js) => js.map((j) => (j.id === r.data.id ? r.data : j))); else if (r.status === 404) { setCurrentId(null); void refresh(); } }, 1000);
    return () => clearInterval(t);
  }, [current, refresh]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const choose = async (f: File | null) => {
    setFileError(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); setFile(null);
    if (!f) return;
    if (f.size > config.limits.maxMb * 1024 * 1024) return setFileError(`The photo is larger than ${config.limits.maxMb} MB.`);
    const c = checkPhoto(new Uint8Array(await f.arrayBuffer()));
    if (!c.ok) return setFileError(c.message);
    setFile(f); setPreview(URL.createObjectURL(f)); // shown only in this browser; nothing is sent until you press Create
  };
  const removePhoto = () => { void choose(null); if (input.current) input.current.value = ""; };
  const create = async () => {
    if (!file || !item || !pick || !consent) return;
    setBusy(true); setError(null);
    const f = new FormData();
    f.set("photo", file); f.set("productId", item.id); if (pick.sku) f.set("sku", pick.sku); if (pick.color) f.set("color", pick.color); if (pick.size) f.set("size", pick.size);
    f.set("consent", "yes"); f.set("consentVersion", config.consentVersion); f.set("consentProvider", provider.id); if (provider.test) f.set("testMode", testMode);
    const r = await call<JobView>("POST", "/api/tryon/jobs", f);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    removePhoto(); setConsent(false); // consent is given per upload, never carried over
    setCurrentId(r.data.id); setJobs((js) => [r.data, ...js]); void refreshUsage();
  };
  const del = async (id: string) => {
    const r = await call<{ providerDeletion: string }>("DELETE", `/api/tryon/jobs/${id}`);
    if (!r.ok) return push(r.error, "error");
    setJobs((js) => js.filter((j) => j.id !== id)); setCmp((c) => c.filter((x) => x !== id)); if (currentId === id) setCurrentId(null);
    push("Deleted your photo data and result", "success");
  };
  const delAll = async () => { const r = await call<{ deleted: number }>("DELETE", "/api/tryon/jobs"); if (!r.ok) return push(r.error, "error"); setJobs([]); setCurrentId(null); setCmp([]); push(`Deleted ${r.data.deleted} try-on${r.data.deleted === 1 ? "" : "s"}`, "success"); };
  const save = async (j: JobView) => { const r = await call<JobView>("PATCH", `/api/tryon/jobs/${j.id}`, { saved: !j.saved }); if (r.ok) { setJobs((js) => js.map((x) => (x.id === j.id ? r.data : x))); push(r.data.saved ? `Saved for ${config.limits.retention.savedDays} days` : "No longer saved (deleted after 24 hours)", "success"); } else push(r.error, "error"); };

  const unsupported = item && !item.photo.supported ? item.photo.reason : null;
  const done = jobs.filter((j) => j.status === "succeeded");
  const compared = cmp.map((id) => done.find((j) => j.id === id)).filter((j): j is JobView => !!j);
  const ready = !!file && consent && !!item && !unsupported && !busy;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-sm bg-accent px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink">AI photo try-on</span>
        <span className="text-sm text-mute">Service: {provider.label}</span>{usage && <span className="text-xs text-mute">· {usage.used}/{usage.limit} used in the last 24 h</span>}</div>
      {provider.test && <p className="rounded-sm border border-warn/50 bg-surface p-3 text-sm" role="note" data-testid="test-banner"><strong>Development test provider.</strong> No AI is used. It never looks at your photo and returns a placeholder image marked “TEST OUTPUT, NO AI USED”. It exists to test the upload, consent, progress, failure and deletion flow.</p>}

      {unsupported && <p className="rounded-md border border-line bg-surface p-3 text-sm" role="status">{unsupported} Choose another product, or use Avatar preview.</p>}

      {current && (isActive(current.status) ? <Progress job={current} onCancel={() => del(current.id)} />
        : current.status === "failed" ? (
          <div className="rounded-md border border-danger/50 bg-surface p-4" role="alert" data-testid="job-failed">
            <p className="font-medium">We could not create your image</p><p className="mt-1 text-sm">{current.error?.message}</p>
            <p className="mt-2 text-xs text-mute">Your photo was deleted from our servers. {current.error?.retryable ? "You can try again: choose your photo again below." : "Try a different photo."}</p>
            <div className="mt-3 flex gap-2"><button className={btn} onClick={() => setCurrentId(null)}>Try again</button><button className={btn} onClick={() => del(current.id)}>Remove this attempt</button></div>
          </div>
        ) : <Result job={current} item={byId.get(current.productId)} onSave={() => save(current)} onDelete={() => del(current.id)} onNew={() => setCurrentId(null)} />)}

      {(!current || current.status === "failed" ) && (
        <fieldset className="space-y-4 rounded-md border border-line bg-surface p-4" disabled={busy} data-testid="photo-form">
          <legend className="px-1 text-sm font-medium">1. How your photo is used</legend>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-mute">{CONSENT_POINTS.map((p) => <li key={p}>{p}</li>)}</ul>
          <p className="text-xs text-mute">Service’s own statement: {provider.retentionNote}</p>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} data-testid="consent" />
            <span><strong className="font-medium">I agree</strong> that my photo may be processed as described above by “{provider.label}”.</span></label>
          <div>
            <p className="mb-2 text-sm font-medium">2. Choose a photo</p>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={!consent} onChange={(e) => void choose(e.target.files?.[0] ?? null)} aria-describedby="photo-help" aria-label="Photo to upload" className="block w-full text-sm disabled:opacity-50" data-testid="photo-input" />
            <p id="photo-help" className="mt-1 text-xs text-mute">{consent ? "" : "Accept the terms above to choose a photo. "}JPEG, PNG or WebP, up to {config.limits.maxMb} MB, at least {config.limits.minSide} px on each side. A clear photo of one person facing the camera works best. Your photo is not sent until you press Create.</p>
            {fileError && <p className="mt-2 text-sm text-danger" role="alert" data-testid="file-error">{fileError}</p>}
            {preview && <div className="mt-3 flex items-start gap-3">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={preview} alt="Preview of the selected photo (only on your device so far)" className="h-40 w-auto rounded-sm border border-line" /><button type="button" className={btn} onClick={removePhoto}>Remove photo</button></div>}
          </div>
          {provider.test && <label className="flex items-center gap-2 text-xs text-mute">Test provider behavior
            <select className="min-h-9 rounded-sm border border-line bg-paper px-2" value={testMode} onChange={(e) => setTestMode(e.target.value)} data-testid="test-mode">
              {["ok", "fail", "reject", "unreachable", "quota", "slow"].map((m) => <option key={m} value={m}>{m === "ok" ? "Succeed" : m === "fail" ? "Fail while processing" : m === "reject" ? "Reject the photo" : m === "unreachable" ? "Service unreachable" : m === "quota" ? "Service quota reached" : "Never finish (slow)"}</option>)}</select></label>}
          <div>
            <button type="button" onClick={create} disabled={!ready} className="min-h-12 rounded-sm bg-ink px-6 text-sm font-medium uppercase tracking-[0.12em] text-paper disabled:opacity-40" data-testid="create">{busy ? "Sending…" : "Create AI try-on"}</button>
            {!item && <p className="mt-2 text-xs text-mute">Choose a product first.</p>}
            {error && <p className="mt-2 text-sm text-danger" role="alert" data-testid="create-error">{error}</p>}
          </div>
        </fieldset>
      )}

      <section aria-label="Your AI try-ons" className="rounded-md border border-line bg-surface p-4">
        <div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs uppercase tracking-wider text-mute">Your AI try-ons ({jobs.length})</p>
          {jobs.length > 0 && <button className={btn} onClick={delAll} data-testid="delete-all">Delete all my photos and results</button>}</div>
        {jobs.length === 0 ? <p className="text-sm text-mute">None yet. Results are private to your account.</p> : (
          <ul className="space-y-2">{jobs.map((j) => { const it = byId.get(j.productId); return (
            <li key={j.id} className="flex flex-wrap items-center gap-3 text-sm" data-job={j.id}>
              {j.status === "succeeded" && <label className="flex items-center"><span className="sr-only">Compare</span><input type="checkbox" className="size-5" checked={cmp.includes(j.id)} onChange={() => setCmp((c) => (c.includes(j.id) ? c.filter((x) => x !== j.id) : [...c, j.id].slice(-2)))} /></label>}
              <span className="min-w-0 flex-1 truncate">{it?.name ?? "Product"} <span className="text-xs text-mute">· {j.status === "succeeded" ? "ready" : j.status === "failed" ? "failed" : STAGE_TEXT[j.stage] ?? j.status} · {fmtTime(j.createdAt)}{j.saved ? " · saved" : ""}</span></span>
              <button className={btn} onClick={() => setCurrentId(j.id)}>Open</button><button className={btn} onClick={() => del(j.id)} aria-label={`Delete try-on of ${it?.name ?? "product"}`}>Delete</button></li>); })}</ul>)}
        {done.length > 1 && <p className="mt-2 text-xs text-mute">Tick two ready results to compare them.</p>}
        {compared.length === 2 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="photo-compare">{compared.map((j) => (
            <figure key={j.id} className="overflow-hidden rounded-md border border-line"><div className="relative">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/api/tryon/jobs/${j.id}/result`} alt={`${j.test ? "Test output" : "AI-generated image"} for ${byId.get(j.productId)?.name ?? "product"}`} className="w-full bg-paper" />
              <span className="absolute left-2 top-2 rounded-sm bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink">{j.test ? "Test output · no AI" : "AI-generated"}</span></div>
              <figcaption className="p-2 text-xs text-mute">{byId.get(j.productId)?.name}</figcaption></figure>))}</div>)}
      </section>
    </div>
  );
}

function Progress({ job, onCancel }: { job: JobView; onCancel: () => void }) {
  const steps = ["queued", "uploading", "processing", "finishing"], at = Math.max(0, steps.indexOf(job.stage));
  return (
    <div className="rounded-md border border-line bg-surface p-4" role="status" aria-live="polite" data-testid="job-progress">
      <p className="font-medium">{STAGE_TEXT[job.stage] ?? "Working"}…</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.progress}><div className="h-full bg-ink transition-[width] duration-500" style={{ width: `${job.progress}%` }} /></div>
      <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">{steps.map((s, i) => <li key={s} className={cn(i < at ? "text-ok" : i === at ? "font-medium text-ink" : "text-mute")}>{i < at ? "✓ " : ""}{STAGE_TEXT[s]}</li>)}</ol>
      <p className="mt-2 text-xs text-mute">{job.progress}% · {job.provider.label}. This page can stay open; you can also cancel and delete everything now.</p>
      <button className={cn(btn, "mt-3")} onClick={onCancel}>Cancel and delete</button>
    </div>
  );
}

function Result({ job, item, onSave, onDelete, onNew }: { job: JobView; item: TryOnItem | undefined; onSave: () => void; onDelete: () => void; onNew: () => void }) {
  return (
    <div className="space-y-3" data-testid="job-result">
      <div className="relative mx-auto max-w-sm overflow-hidden rounded-lg border border-line bg-paper">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/tryon/jobs/${job.id}/result`} alt={job.test ? "Placeholder test image. No AI was used." : `AI-generated image for ${item?.name ?? "the product"}`} className="w-full" />
        <span className="absolute left-3 top-3 rounded-sm bg-accent px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink">{job.test ? "Test output · no AI" : "AI-generated image"}</span>
      </div>
      <p className="text-sm leading-relaxed text-mute" role="note">{job.test ? "This is a placeholder from the development test provider. No AI was used." : "This image was generated by an AI service. It is an illustration, not a prediction of how the garment will fit, drape or look on you, and not a size recommendation."}</p>
      <p className="text-xs text-mute">{job.photoDeletedAt ? `Your photo was deleted from our servers at ${fmtTime(job.photoDeletedAt)}. ` : ""}This result is private to your account and {job.saved ? `kept until ${job.expiresAt ? fmtTime(job.expiresAt) : "you delete it"}` : `is deleted on ${job.expiresAt ? fmtTime(job.expiresAt) : "expiry"} unless you save it`}.</p>
      <div className="flex flex-wrap gap-2"><button className={btn} onClick={onSave} data-testid="save-result">{job.saved ? "Remove from saved" : "Save result"}</button><button className={btn} onClick={onDelete} data-testid="delete-result">Delete result</button><button className={btn} onClick={onNew}>New try-on</button></div>
    </div>
  );
}
