import * as THREE from "three";
import type { FloorKind } from "@/modules/showroom/types";

const cache = new Map<string, THREE.CanvasTexture>();

function canvasTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  cache.set(key, t);
  return t;
}

/** Deterministic pseudo-random so textures are identical between renders. */
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

export function floorTexture(kind: FloorKind, base: string, line: string, repeat: [number, number]) {
  return canvasTexture(`floor|${kind}|${base}|${line}|${repeat}`, 512, 512, (g) => {
    const r = rng(7);
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    const speckle = (n: number, a: number) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${a * r()})`; g.fillRect(r() * 512, r() * 512, 2, 2); } };
    g.strokeStyle = line; g.lineWidth = 3;
    if (kind === "tiles") {
      for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
      speckle(500, 0.06);
    } else if (kind === "planks") {
      for (let y = 0; y < 512; y += 64) {
        g.fillStyle = `rgba(0,0,0,${0.05 + 0.07 * r()})`; g.fillRect(0, y, 512, 64);
        g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke();
        const off = r() * 512; g.beginPath(); g.moveTo(off, y); g.lineTo(off, y + 64); g.stroke();
      }
    } else if (kind === "parquet") {
      for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) {
        g.fillStyle = `rgba(0,0,0,${0.04 + 0.08 * r()})`; g.fillRect(x, y, 64, 64);
        g.beginPath();
        if ((x + y) / 64 % 2 === 0) for (let k = 16; k < 64; k += 16) { g.moveTo(x, y + k); g.lineTo(x + 64, y + k); }
        else for (let k = 16; k < 64; k += 16) { g.moveTo(x + k, y); g.lineTo(x + k, y + 64); }
        g.stroke(); g.strokeRect(x, y, 64, 64);
      }
    } else if (kind === "concrete") {
      speckle(2500, 0.1); g.strokeRect(0, 0, 512, 512);
    } else if (kind === "rings") {
      for (let i = 1; i <= 4; i++) { g.beginPath(); g.arc(256, 256, i * 56, 0, Math.PI * 2); g.stroke(); }
      speckle(400, 0.04);
    } else speckle(800, 0.05);
  }, repeat);
}

export type SignStyle = { bg: string; fg: string; sub: string };

/** Sign artwork drawn to a canvas: no font downloads, correct depth and occlusion in the scene. */
export function signTexture(text: string, subtitle: string, style: SignStyle, w = 1024, h = 256) {
  return canvasTexture(`sign|${text}|${subtitle}|${style.bg}|${style.fg}|${w}x${h}`, w, h, (g) => {
    g.fillStyle = style.bg; g.fillRect(0, 0, w, h);
    g.fillStyle = style.fg; g.textAlign = "center"; g.textBaseline = "middle";
    const fam = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif';
    let size = subtitle ? h * 0.46 : h * 0.54;
    g.font = `${size}px ${fam}`;
    while (g.measureText(text.toUpperCase()).width > w * 0.9 && size > 12) { size -= 4; g.font = `${size}px ${fam}`; }
    g.fillText(text.toUpperCase(), w / 2, subtitle ? h * 0.42 : h / 2);
    if (subtitle) {
      g.fillStyle = style.sub; g.font = `${h * 0.14}px ui-sans-serif,system-ui,sans-serif`;
      g.fillText(subtitle.toUpperCase(), w / 2, h * 0.78);
    }
  });
}
