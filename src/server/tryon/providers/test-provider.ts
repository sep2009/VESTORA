import "server-only";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { TryOnProviderError, type TryOnProvider } from "./provider";

/**
 * DEVELOPMENT TEST PROVIDER. It exercises the whole pipeline (upload, consent, job states, progress, failures, result access,
 * deletion) WITHOUT any AI. Its "result" is a hatched placeholder image that says "TEST OUTPUT, NO AI USED". It never looks at the photo.
 * Enabled only outside production, or with ALLOW_TEST_TRYON=1.
 */
const DURATION_MS = Number(process.env.TRYON_TEST_DURATION_MS ?? 2500);

const GLYPHS: Record<string, string[]> = {
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"], E: ["11111", "10000", "11110", "10000", "10000", "10000", "11111"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"], O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"], P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"], A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"], D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"], " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};
const crc = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }; })();
function chunk(type: string, data: Buffer): Buffer { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); }

export function placeholderPng(seed: string): Uint8Array {
  const W = 480, H = 600, hue = createHash("sha256").update(seed).digest()[0]! % 3;
  const px = Buffer.alloc(H * (W * 3 + 1));
  const text = (lines: string[]) => lines.map((l, i) => ({ l, y: 230 + i * 80 }));
  const marks = text(["TEST OUTPUT", "NO AI USED"]);
  const on = (x: number, y: number) => { for (const { l, y: y0 } of marks) { const s = 8, w = l.length * 6 * s, x0 = Math.floor((W - w) / 2); if (y >= y0 && y < y0 + 7 * s && x >= x0 && x < x0 + w) { const ci = Math.floor((x - x0) / (6 * s)), cx = Math.floor(((x - x0) % (6 * s)) / s); if (cx < 5) return GLYPHS[l[ci]!]?.[Math.floor((y - y0) / s)]?.[cx] === "1"; } } return false; };
  for (let y = 0; y < H; y++) {
    const row = y * (W * 3 + 1); px[row] = 0;
    for (let x = 0; x < W; x++) {
      const stripe = ((x + y) >> 4) & 1, base = stripe ? 232 : 210, i = row + 1 + x * 3;
      let r = base, g = base, b = base; if (hue === 0) r -= 12; if (hue === 1) g -= 12; if (hue === 2) b -= 12;
      if (on(x, y)) { r = 20; g = 20; b = 20; }
      px[i] = r; px[i + 1] = g; px[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  return new Uint8Array(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(px)), chunk("IEND", Buffer.alloc(0))]));
}

export function testProvider(): TryOnProvider {
  return {
    id: "test", label: "Development test provider (no AI)", test: true, supports: ["upper_body", "lower_body", "dress", "outerwear"],
    retentionNote: "This is the development test provider. It does not read or keep your photo and creates no AI image.",
    async submit(input) {
      const mode = input.testMode ?? "ok";
      if (mode === "unreachable") throw new TryOnProviderError("The try-on service could not be reached.", "provider_unreachable", true);
      if (mode === "reject") throw new TryOnProviderError("The service could not use this photo (for example, no person was found).", "photo_rejected", false);
      if (mode === "quota") throw new TryOnProviderError("The service has reached its usage limit. Please try again later.", "provider_quota", true);
      // state lives in the id itself, so any server instance can answer for it (serverless: no shared memory)
      return { providerJobId: `test_${input.jobId}_${Date.now()}_${mode}` };
    },
    async poll(id) {
      const m = /^test_.+_(\d+)_([a-z]+)$/.exec(id); if (!m) return { state: "failed", code: "unknown_job", message: "The service lost this job.", retryable: true };
      const r = { at: Number(m[1]), mode: m[2]! };
      const elapsed = Date.now() - r.at, dur = r.mode === "slow" ? 60_000 : DURATION_MS;
      if (r.mode === "fail" && elapsed > DURATION_MS / 2) return { state: "failed", code: "generation_failed", message: "The service could not create an image from this photo.", retryable: true };
      if (elapsed < dur) return { state: "processing", progress: Math.min(95, Math.round((elapsed / dur) * 100)) };
      return { state: "succeeded", image: { bytes: placeholderPng(id), mime: "image/png" } };
    },
    async delete() { /* nothing is kept */ },
  };
}
