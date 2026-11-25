import "server-only";
import { randomBytes } from "node:crypto";
import { ready } from "./db";

export const LIMITS = { image: 5 * 1024 * 1024, model: 25 * 1024 * 1024 } as const;
export type UploadKind = keyof typeof LIMITS;

type Sniffed = { ext: string; mime: string } | null;
const startsWith = (b: Buffer, sig: number[], off = 0) => sig.every((v, i) => b[off + i] === v);

/** Identify a file by its content, never by its name or the client's claimed type. SVG and anything else is refused. */
export function sniff(kind: UploadKind, b: Buffer): Sniffed {
  if (kind === "image") {
    if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: "png", mime: "image/png" };
    if (startsWith(b, [0xff, 0xd8, 0xff])) return { ext: "jpg", mime: "image/jpeg" };
    if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) return { ext: "webp", mime: "image/webp" };
    if (startsWith(b, [0x47, 0x49, 0x46, 0x38])) return { ext: "gif", mime: "image/gif" };
    if (startsWith(b, [0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], 4)) return { ext: "avif", mime: "image/avif" };
    return null;
  }
  if (startsWith(b, [0x67, 0x6c, 0x54, 0x46])) { // "glTF" binary container, version 2, declared length must match
    return b.length >= 20 && b.readUInt32LE(4) === 2 && b.readUInt32LE(8) === b.length ? { ext: "glb", mime: "model/gltf-binary" } : null;
  }
  const head = b.subarray(0, 1).toString("utf8");
  if (head === "{") {
    try {
      const j = JSON.parse(b.toString("utf8")) as { asset?: { version?: string }; buffers?: { uri?: string }[]; images?: { uri?: string }[] };
      if (j.asset?.version !== "2.0") return null;
      // external files would be unvalidated: only embedded data: URIs are accepted
      const uris = [...(j.buffers ?? []), ...(j.images ?? [])].map((x) => x.uri).filter((u): u is string => !!u);
      if (uris.some((u) => !u.startsWith("data:"))) return null;
      return { ext: "gltf", mime: "model/gltf+json" };
    } catch { return null; }
  }
  return null;
}

/** Uploaded files are stored in the database (table `uploads`), never on disk. The public path is /api/uploads/<images|models>/<name>. */
export async function saveUpload(kind: UploadKind, bytes: Buffer): Promise<{ ok: true; url: string; bytes: number } | { ok: false; status: number; error: string }> {
  if (bytes.length === 0) return { ok: false, status: 422, error: "The file is empty" };
  if (bytes.length > LIMITS[kind]) return { ok: false, status: 413, error: `File too large (limit ${Math.round(LIMITS[kind] / 1024 / 1024)} MB)` };
  const t = sniff(kind, bytes);
  if (!t) return { ok: false, status: 415, error: kind === "image" ? "Not a supported image (PNG, JPEG, WebP, GIF or AVIF)" : "Not a valid GLB/GLTF 2.0 model (embedded resources only)" };
  const folder = kind === "image" ? "images" : "models", name = `${randomBytes(8).toString("hex")}.${t.ext}`;
  const db = await ready();
  await db.query("insert into uploads (name, kind, mime, bytes) values ($1, $2, $3, $4)", [`${folder}/${name}`, kind, t.mime, bytes]);
  return { ok: true, url: `/api/uploads/${folder}/${name}`, bytes: bytes.length };
}

const SAFE = /^(images|models)\/[a-f0-9]{16}\.(png|jpg|webp|gif|avif|glb|gltf)$/;

/** Read an uploaded file by its public path. Anything that is not exactly one of our generated names is refused (no traversal). */
export async function readUpload(rel: string): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!SAFE.test(rel)) return null;
  const db = await ready();
  const r = (await db.query<{ bytes: Buffer; mime: string }>("select bytes, mime from uploads where name = $1", [rel])).rows[0];
  return r ? { bytes: Buffer.from(r.bytes), mime: r.mime } : null;
}
