import * as THREE from "three";
import { useQuality } from "@/stores/quality-store";

/**
 * Procedural PBR textures (albedo + normal + roughness), generated once and cached.
 * No downloads: every map is derived from noise and a few drawing primitives.
 * They are tileable, so surfaces can repeat them at real-world scale.
 */
export type TexKind =
  | "marble" | "travertine" | "limestone" | "concrete" | "terrazzo" | "oak" | "walnut" | "parquet"
  | "plaster" | "fabric" | "leather" | "brushed" | "wool" | "slat";

export type PbrMaps = { map: THREE.DataTexture | null; normalMap: THREE.DataTexture; roughnessMap: THREE.DataTexture };


/* ───────── tileable value noise ───────── */
function hash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}
const fade = (t: number) => t * t * (3 - 2 * t);
/** Value noise that repeats every `p` lattice cells, so textures tile without seams. */
function vnoise(x: number, y: number, p: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const m = (v: number) => ((v % p) + p) % p;
  const a = hash(m(xi), m(yi), seed), b = hash(m(xi + 1), m(yi), seed), c = hash(m(xi), m(yi + 1), seed), d = hash(m(xi + 1), m(yi + 1), seed);
  const u = fade(xf), v = fade(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(u: number, v: number, base: number, oct: number, seed: number) {
  let s = 0, amp = 0.5, f = base, norm = 0;
  for (let o = 0; o < oct; o++) { s += amp * vnoise(u * f, v * f, f, seed + o * 17); norm += amp; amp *= 0.5; f *= 2; }
  return s / norm;
}
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

const hex = (c: string) => { const k = new THREE.Color(c); return [k.r * 255, k.g * 255, k.b * 255] as const; };
const mix = (a: readonly number[], b: readonly number[], t: number) => [a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t, a[2]! + (b[2]! - a[2]!) * t] as const;
const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

type Field = { height: Float32Array; albedo: Uint8ClampedArray | null; rough: Float32Array };

function generate(kind: TexKind, base: string, N: number): Field {
  const height = new Float32Array(N * N), rough = new Float32Array(N * N);
  const needsAlbedo = !["fabric", "leather", "brushed", "wool", "plaster"].includes(kind);
  const albedo = needsAlbedo ? new Uint8ClampedArray(N * N * 4) : null;
  const c0 = hex(base);
  const set = (i: number, h: number, r: number, c?: readonly number[]) => {
    height[i] = h; rough[i] = r;
    if (albedo && c) { albedo[i * 4] = clamp255(c[0]!); albedo[i * 4 + 1] = clamp255(c[1]!); albedo[i * 4 + 2] = clamp255(c[2]!); albedo[i * 4 + 3] = 255; }
  };
  const R = rng(kind.length * 977 + 13);

  if (kind === "marble") {
    // Soft grey veining on a pale, slightly cool body: thin, low-contrast, branching, like honed Carrara.
    const vein = hex("#9b9a96"), cloudy = hex("#d6d3cc");
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const w = fbm(u, v, 3, 5, 3);
      const t = Math.abs(Math.sin((u * 1.0 + v * 0.7) * Math.PI * 2 + w * 7));
      const main = Math.pow(1 - t, 38);
      const w2 = fbm(u, v, 6, 4, 9);
      const fine = Math.pow(1 - Math.abs(Math.sin((u * 2 - v * 3) * Math.PI * 2 + w2 * 12)), 70) * 0.6;
      const cloud = fbm(u, v, 4, 4, 21) - 0.5;
      let col = mix(c0, cloudy, Math.max(0, cloud * 1.2));
      col = mix(col, vein, Math.min(0.42, main * 0.4 + fine * 0.22));
      const joint = x < 2 || y < 2 || Math.abs(u - 0.5) < 0.003 || Math.abs(v - 0.5) < 0.003;
      set(i, joint ? -1 : cloud * 0.02, joint ? 0.45 : 0.1 + 0.06 * fbm(u, v, 6, 3, 5), joint ? mix(col, vein, 0.35) : col);
    }
  } else if (kind === "travertine" || kind === "limestone") {
    const dark = hex(kind === "travertine" ? "#8f7c63" : "#9a9890");
    const bands = kind === "travertine" ? 70 : 8;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const n = fbm(u, v, 6, 5, 31), pores = vnoise(u * 90, v * 90, 90, 5);
      const pit = kind === "travertine" && pores > 0.82 && n < 0.5 ? 1 : 0;
      const band = Math.sin(v * bands * Math.PI + n * 5) * 0.5 + 0.5;
      let col = mix(c0, dark, (n - 0.5) * 0.55 + band * (kind === "travertine" ? 0.1 : 0.03) + pit * 0.5);
      const joint = x < 2 || y < 2 || Math.abs(u - 0.5) < 0.003 || Math.abs(v - 0.5) < 0.003;
      if (joint) col = mix(col, dark, 0.6);
      set(i, joint ? -1 : n * 0.3 - pit * 0.8, kind === "travertine" ? 0.55 + 0.15 * n : 0.45 + 0.2 * n, col);
    }
  } else if (kind === "concrete") {
    const dark = hex("#4c4c4a");
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const n = fbm(u, v, 4, 6, 41), fine = vnoise(u * 160, v * 160, 160, 7), pit = fine > 0.93 ? 1 : 0;
      const stain = fbm(u, v, 2, 3, 51);
      let col = mix(c0, dark, (n - 0.5) * 0.7 + (stain - 0.5) * 0.3 + pit * 0.35);
      const joint = x < 3 || y < 3 || Math.abs(u - 0.5) < 0.004 || Math.abs(v - 0.5) < 0.004;
      if (joint) col = mix(col, dark, 0.55);
      set(i, joint ? -1.2 : n * 0.5 + fine * 0.15 - pit, 0.78 + 0.18 * n, col);
    }
  } else if (kind === "terrazzo") {
    const cv = document.createElement("canvas"); cv.width = cv.height = N; const g = cv.getContext("2d")!;
    g.fillStyle = base; g.fillRect(0, 0, N, N);
    const chips = ["#8d8a84", "#d9d2c3", "#b5a78e", "#5c5a56", "#c7bca7", "#a39382"];
    for (let k = 0; k < N * 0.9; k++) {
      const x = R() * N, y = R() * N, r = 1.5 + R() * R() * (N / 36);
      g.fillStyle = chips[Math.floor(R() * chips.length)]!;
      for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]] as const) { g.beginPath(); g.ellipse(x + ox, y + oy, r, r * (0.6 + R() * 0.4), R() * 3, 0, Math.PI * 2); g.fill(); }
    }
    const img = g.getImageData(0, 0, N, N).data;
    for (let i = 0; i < N * N; i++) {
      const u = (i % N) / N, v = Math.floor(i / N) / N, n = fbm(u, v, 8, 3, 61);
      const col: [number, number, number] = [img[i * 4]! * (0.96 + n * 0.06), img[i * 4 + 1]! * (0.96 + n * 0.06), img[i * 4 + 2]! * (0.96 + n * 0.06)];
      set(i, 0, 0.22 + 0.1 * n, col);
    }
  } else if (kind === "oak" || kind === "walnut") {
    const dark = mix(c0, [20, 12, 6], 0.45), rows = 6;
    const tones = Array.from({ length: rows }, () => R());
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x, row = Math.floor(v * rows), lv = v * rows - row;
      const off = hash(row, 3, 77) * 4;
      const grain = vnoise((u * 3 + off) * 1, lv * 40 + row * 7, 40, 83) * 0.6 + fbm(u, v, 3, 3, 90 + row) * 0.4;
      const ring = Math.sin((lv * 14 + grain * 6) * Math.PI) * 0.5 + 0.5;
      let col = mix(c0, dark, 0.15 + grain * 0.35 + ring * 0.12 + (tones[row]! - 0.5) * 0.25);
      const seam = lv < 0.02 || lv > 0.98 || Math.abs(((u + off / 4) % 1) - 0.5) < 0.004;
      if (seam) col = mix(col, [10, 6, 3], 0.7);
      set(i, seam ? -1 : grain * 0.4 + ring * 0.1, 0.42 + 0.14 * grain, col);
    }
  } else if (kind === "parquet") {
    const dark = mix(c0, [18, 10, 5], 0.5), B = 8;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const bx = Math.floor(u * B), by = Math.floor(v * B), lx = u * B - bx, ly = v * B - by;
      const horiz = (bx + by) % 2 === 0;
      const along = horiz ? lx : ly, across = horiz ? ly : lx;
      const grain = vnoise(along * 3 + hash(bx, by, 5) * 5, across * 28, 28, 89 + bx + by);
      const strip = Math.floor(across * 4), sl = across * 4 - strip;
      let col = mix(c0, dark, 0.06 + grain * 0.22 + (hash(bx, by, strip) - 0.5) * 0.16);
      const seam = sl < 0.04 || sl > 0.96 || lx < 0.01 || ly < 0.01;
      if (seam) col = mix(col, [12, 7, 3], 0.7);
      set(i, seam ? -1 : grain * 0.15, 0.4 + 0.08 * grain, col);
    }
  } else if (kind === "slat") {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      const grain = vnoise(u * 8, v * 70, 70, 95), tone = hash(Math.floor(u * 8), 1, 3);
      set(i, 0, 0.5 + 0.1 * grain, mix(c0, [30, 18, 8], 0.15 + grain * 0.3 + tone * 0.15));
    }
  } else {
    // tint-only maps: albedo omitted, only height + roughness are shaped
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, i = y * N + x;
      if (kind === "plaster") { const n = fbm(u, v, 8, 3, 101); set(i, n * 0.25 + vnoise(u * 200, v * 200, 200, 3) * 0.1, 0.88 + 0.08 * n); }
      else if (kind === "fabric") {
        const T = 96, wx = (u * T) % 1, wy = (v * T) % 1, over = (Math.floor(u * T) + Math.floor(v * T)) % 2 === 0;
        const thread = over ? Math.sin(wx * Math.PI) : Math.sin(wy * Math.PI);
        set(i, thread * 0.25 + vnoise(u * 300, v * 300, 300, 11) * 0.3, 0.86 + 0.04 * (1 - thread));
      } else if (kind === "wool") {
        const n = vnoise(u * 220, v * 220, 220, 13) * 0.7 + vnoise(u * 90, v * 90, 90, 14) * 0.3;
        set(i, n, 0.95);
      } else if (kind === "brushed") {
        const s = vnoise(u * 4, v * 420, 420, 17) * 0.7 + vnoise(u * 12, v * 900, 900, 18) * 0.3;
        set(i, s * 0.5, 0.32 + 0.22 * s);
      } else { // leather: cellular pebble grain
        const cx = Math.floor(u * 60), cy = Math.floor(v * 60);
        let dmin = 9;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const gx = (((cx + ox) % 60) + 60) % 60, gy = (((cy + oy) % 60) + 60) % 60;
          const px = cx + ox + hash(gx, gy, 21), py = cy + oy + hash(gx, gy, 22);
          dmin = Math.min(dmin, Math.hypot(u * 60 - px, v * 60 - py));
        }
        set(i, Math.min(1, dmin) * 0.9, 0.5 + 0.12 * Math.min(1, dmin));
      }
    }
  }
  return { height, albedo, rough };
}

function toTextures(f: Field, N: number, normalStrength: number): PbrMaps {
  const aniso = useQuality.getState().level === "high" ? 8 : 2;
  const mk = (data: Uint8ClampedArray, srgb: boolean) => {
    const t = new THREE.DataTexture(new Uint8Array(data.buffer as ArrayBuffer), N, N, THREE.RGBAFormat);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
    return t;
  };
  // normal map from the height field (Sobel, wrapping)
  const normal = new Uint8ClampedArray(N * N * 4), rough = new Uint8ClampedArray(N * N * 4);
  const h = f.height, at = (x: number, y: number) => h[((y + N) % N) * N + ((x + N) % N)]!;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
    const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
    let nx = -dx * normalStrength, ny = dy * normalStrength, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * N + x) * 4;
    normal[i] = (nx * 0.5 + 0.5) * 255; normal[i + 1] = (ny * 0.5 + 0.5) * 255; normal[i + 2] = (nz * 0.5 + 0.5) * 255; normal[i + 3] = 255;
    const r = clamp255(f.rough[y * N + x]! * 255);
    rough[i] = r; rough[i + 1] = r; rough[i + 2] = r; rough[i + 3] = 255;
  }
  return { map: f.albedo ? mk(f.albedo, true) : null, normalMap: mk(normal, false), roughnessMap: mk(rough, false) };
}

const NORMAL_STRENGTH: Partial<Record<TexKind, number>> = { marble: 0.6, travertine: 2, limestone: 1.2, concrete: 2.2, terrazzo: 0.4, oak: 1.4, walnut: 1.4, parquet: 1.4, slat: 0.8, plaster: 1.2, fabric: 0.55, leather: 2.2, brushed: 1.2, wool: 2.4 };

const baseCache = new Map<string, PbrMaps>();
const cloneCache = new Map<string, PbrMaps>();

/**
 * `repeat` is how many times the texture tiles across the surface (choose it from the real-world size).
 * The pattern itself is generated once per (kind, colour, quality); each distinct repeat gets cheap clones
 * that share the same image data and GPU upload.
 */
export function pbr(kind: TexKind, base: string, repeat: [number, number]): PbrMaps {
  const level = useQuality.getState().level;
  const key = `${kind}|${base}|${level}`;
  let maps = baseCache.get(key);
  if (!maps) {
    const N = level === "lite" ? 192 : ["fabric", "leather", "brushed", "wool"].includes(kind) ? 256 : 384;
    maps = toTextures(generate(kind, base, N), N, NORMAL_STRENGTH[kind] ?? 1);
    baseCache.set(key, maps);
  }
  const ck = `${key}|${repeat[0].toFixed(3)}|${repeat[1].toFixed(3)}`;
  let hit = cloneCache.get(ck);
  if (!hit) {
    const c = (t: THREE.DataTexture | null) => { if (!t) return null; const k = t.clone(); k.repeat.set(repeat[0], repeat[1]); k.needsUpdate = true; return k; };
    hit = { map: c(maps.map), normalMap: c(maps.normalMap)!, roughnessMap: c(maps.roughnessMap)! };
    cloneCache.set(ck, hit);
  }
  return hit;
}

export function disposeTextures() {
  const all = (m: PbrMaps) => { m.map?.dispose(); m.normalMap.dispose(); m.roughnessMap.dispose(); };
  cloneCache.forEach(all); baseCache.forEach(all);
  cloneCache.clear(); baseCache.clear();
}
