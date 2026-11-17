import type { ItemKind } from "../types";

/**
 * ASSET REPLACEMENT POINT.
 *
 * Every product currently shown in the showroom is a *procedural placeholder* (tailored silhouettes and
 * simple accessory models built in code). To replace one kind with a real asset:
 *   1. Put an optimised, Draco/meshopt-compressed GLB in `public/models/<kind>.glb` (about 1.5 m tall for
 *      garments, true size for accessories; Y up, origin at the base).
 *   2. Set the path below.
 * A catalog product with its own `assets.modelUrl` always wins over this per-kind default.
 * A path that does not load falls back to the procedural placeholder, and the info card keeps saying
 * "Placeholder model" until a real model is used. Nothing is substituted silently.
 */
export const KIND_MODELS: Record<ItemKind, string | null> = {
  tee: null, shirt: null, hoodie: null, jacket: null, coat: null, dress: null, suit: null, trousers: null,
  sneaker: null, bag: null, watch: null, glasses: null,
};

export const kindModel = (kind: ItemKind) => KIND_MODELS[kind];
