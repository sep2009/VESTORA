import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

export type ModelStats = { triangles: number; meshes: number; materials: number; textures: { name: string; width: number; height: number }[]; bytes: number | null };
export type LoadedModel = { root: THREE.Object3D; stats: ModelStats };

/** Above this the model is too heavy for a phone; it is refused with a clear message instead of freezing the page. */
export const MAX_TRIANGLES = 1_500_000;

let draco: DRACOLoader | null = null;
/** One shared loader. Draco and meshopt compressed files work; the decoder is served from /draco. */
function loader() {
  draco ??= new DRACOLoader().setDecoderPath("/draco/");
  const l = new GLTFLoader();
  l.setDRACOLoader(draco);
  l.setMeshoptDecoder(MeshoptDecoder);
  return l;
}

const imageSize = (t: THREE.Texture) => {
  const im = t.image as { width?: number; height?: number; videoWidth?: number } | undefined;
  return { width: im?.width ?? 0, height: im?.height ?? 0 };
};

/** Loads and validates a GLB/GLTF. Rejects with a readable message for network errors, bad files, empty scenes and over-heavy models. */
export function loadModel(url: string, onProgress: (loaded: number, total: number | null) => void, signal: AbortSignal): Promise<LoadedModel> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error("cancelled"));
    let bytes: number | null = null;
    const l = loader();
    l.load(
      url,
      (gltf) => {
        if (signal.aborted) { disposeObject(gltf.scene); return reject(new Error("cancelled")); }
        let triangles = 0, meshes = 0;
        const mats = new Set<THREE.Material>(), texs = new Map<THREE.Texture, string>();
        gltf.scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          meshes++;
          const g = m.geometry;
          triangles += (g.index ? g.index.count : g.getAttribute("position")?.count ?? 0) / 3;
          for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
            mats.add(mat);
            for (const [k, v] of Object.entries(mat)) if (v && (v as THREE.Texture).isTexture) texs.set(v as THREE.Texture, `${mat.name || "material"} · ${k}`);
          }
        });
        if (meshes === 0) { disposeObject(gltf.scene); return reject(new Error("The file contains no 3D geometry.")); }
        if (triangles > MAX_TRIANGLES) { disposeObject(gltf.scene); return reject(new Error(`The model has ${Math.round(triangles / 1000)}k triangles, which is too heavy to show smoothly (limit ${MAX_TRIANGLES / 1000}k). It needs optimising.`)); }
        resolve({ root: gltf.scene, stats: { triangles: Math.round(triangles), meshes, materials: mats.size, textures: [...texs].map(([t, name]) => ({ name, ...imageSize(t) })), bytes } });
      },
      (e) => { bytes = e.loaded; onProgress(e.loaded, e.lengthComputable && e.total > 0 ? e.total : null); },
      (err) => {
        const msg = err instanceof Error ? err.message : "";
        const code = /responded with (\d{3})/.exec(msg)?.[1];
        reject(new Error(code === "404" ? "The model file was not found." : code ? `The model file could not be downloaded (HTTP ${code}).` : /fetch|network/i.test(msg) ? "The model file could not be downloaded." : "The model file is not a valid GLB/GLTF."));
      },
    );
  });
}

/** Frees geometry, materials and textures of a loaded model (three.js does not do this on its own). */
export function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      for (const v of Object.values(mat)) if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose();
      mat.dispose();
    }
  });
}
