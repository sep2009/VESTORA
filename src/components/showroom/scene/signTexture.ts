import * as THREE from "three";

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
