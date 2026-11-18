// Writes a small, valid GLB (a plain tee-shaped test model with a woven base-color texture) for testing the 3D viewer.
// It is a TEST FIXTURE, not a real product's model. Usage: node scripts/make-test-model.mjs out.glb
import { writeFileSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";
import * as THREE from "three";

const out = process.argv[2] ?? "test-tee.glb";

// --- geometry: torso + two sleeves, merged with transforms applied
const parts = [];
const torso = new THREE.CylinderGeometry(0.24, 0.21, 0.7, 40, 1, true); torso.scale(1, 1, 0.55); parts.push(torso);
const mk = (side) => { const g = new THREE.CylinderGeometry(0.075, 0.062, 0.26, 20, 1, true); g.rotateZ(side * (Math.PI / 2 + 0.5)); g.translate(side * 0.30, 0.27, 0); return g; };
parts.push(mk(1), mk(-1));
const pos = [], nor = [], uv = [], idx = [];
for (const g of parts) {
  const base = pos.length / 3, p = g.getAttribute("position"), n = g.getAttribute("normal"), t = g.getAttribute("uv");
  for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(t.getX(i) * 6, t.getY(i) * 3); }
  for (const i of g.index.array) idx.push(base + i);
}
const bounds = (a) => { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < a.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], a[i + k]); mx[k] = Math.max(mx[k], a[i + k]); } return [mn, mx]; };
const [pmin, pmax] = bounds(pos);

// --- texture: 256px woven pattern as PNG
const W = 256, raw = Buffer.alloc((W * 3 + 1) * W);
for (let y = 0; y < W; y++) { raw[y * (W * 3 + 1)] = 0; for (let x = 0; x < W; x++) {
  const weave = ((x >> 2) + (y >> 2)) % 2 ? 1 : 0.82, stripe = (x >> 5) % 4 === 0 ? [40, 70, 120] : [196, 168, 130];
  const o = y * (W * 3 + 1) + 1 + x * 3; for (let k = 0; k < 3; k++) raw[o + k] = Math.round(stripe[k] * weave);
} }
const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, "ascii"); data.copy(b, 8); b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);

// --- binary buffer
const pad = (b) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]);
const f32 = (a) => Buffer.from(new Float32Array(a).buffer), u16 = (a) => Buffer.from(new Uint16Array(a).buffer);
const views = [f32(pos), f32(nor), f32(uv), u16(idx), png].map(pad);
let off = 0; const bufferViews = views.map((b, i) => { const v = { buffer: 0, byteOffset: off, byteLength: b.length, ...(i < 3 ? { target: 34962 } : i === 3 ? { target: 34963 } : {}) }; off += b.length; return v; });
bufferViews[4].byteLength = png.length;
const json = {
  asset: { version: "2.0", generator: "vestora test fixture" },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: "TestTee" }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
  materials: [{ name: "woven", pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.85 }, doubleSided: true }],
  textures: [{ source: 0, sampler: 0 }], samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }], images: [{ bufferView: 4, mimeType: "image/png" }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: pos.length / 3, type: "VEC3", min: pmin, max: pmax },
    { bufferView: 1, componentType: 5126, count: nor.length / 3, type: "VEC3" },
    { bufferView: 2, componentType: 5126, count: uv.length / 2, type: "VEC2" },
    { bufferView: 3, componentType: 5123, count: idx.length, type: "SCALAR" },
  ],
  bufferViews, buffers: [{ byteLength: off }],
};
const bin = Buffer.concat(views), jb = Buffer.from(JSON.stringify(json));
const jpad = Buffer.concat([jb, Buffer.alloc((4 - (jb.length % 4)) % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + jpad.length + 8 + bin.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
writeFileSync(out, Buffer.concat([head, ch(jpad.length, 0x4e4f534a), jpad, ch(bin.length, 0x004e4942), bin]));
console.log("wrote", out, (12 + 8 + jpad.length + 8 + bin.length) + " bytes");
