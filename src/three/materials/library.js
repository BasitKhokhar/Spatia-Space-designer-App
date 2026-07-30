// Shared MeshStandardMaterial cache.
//
// WHY THIS MATTERS MORE THAN IT LOOKS
// Before this, every <meshStandardMaterial> JSX element in models.jsx created a
// distinct material instance — roughly 1,500 of them for a furnished two-floor
// plan. Each *unique* material forces three to compile a shader program the first
// time it is drawn, and that compile burst is the multi-second stall when opening
// the 3D view. Sharing materials collapses ~1,500 instances into ~60 and the
// program count into low double digits.
//
// The trade-off: a shared material must not be mutated by a caller. Treat every
// material returned from here as immutable.

import { Color, MeshStandardMaterial } from 'three';
import { materialDef } from './manifest';
import { getTexture } from './textures';

const CACHE = new Map(); // key -> MeshStandardMaterial
// Bounded by the *variety* of finishes in a scene, not the number of objects, so
// this is comfortably above what any real plan reaches.
const MAX = 800;

// Global gain on indirect light, driven by the active lighting preset. Applied to
// every cached material so one knob moves the whole scene.
let envIntensity = 1;

const round2 = (n) => Math.round(n * 100) / 100;

function keyFor(id, color, rough, metal, opacity, emissive, emissiveIntensity, side) {
  return [
    id,
    color,
    rough == null ? '-' : round2(rough),
    metal == null ? '-' : round2(metal),
    opacity == null ? '-' : round2(opacity),
    emissive || '-',
    emissiveIntensity == null ? '-' : round2(emissiveIntensity),
    side == null ? '-' : side,
  ].join('|');
}

/**
 * Get a shared material.
 *
 * @param {string}  id      key into MATERIAL_DEFS (e.g. 'fabric', 'wood', 'paint')
 * @param {string}  color   hex tint multiplied over the albedo map
 * @param {number} [rough]  override roughness
 * @param {number} [metal]  override metalness
 * @param {number} [opacity]
 * @param {string} [emissive]
 * @param {number} [emissiveIntensity]
 * @param {number} [side]   THREE.FrontSide | BackSide | DoubleSide
 * @returns {MeshStandardMaterial} DO NOT MUTATE — it is shared.
 */
export function getMaterial({
  id = 'paint',
  color = '#FFFFFF',
  rough,
  metal,
  opacity,
  emissive,
  emissiveIntensity,
  side,
} = {}) {
  const def = materialDef(id);
  const c = color || def.base || '#FFFFFF';
  const key = keyFor(id, c, rough, metal, opacity, emissive, emissiveIntensity, side);

  const hit = CACHE.get(key);
  if (hit) {
    // Refresh LRU position.
    CACHE.delete(key);
    CACHE.set(key, hit);
    return hit;
  }

  const map = getTexture(def.map);
  const normalMap = getTexture(def.normal);

  const finalOpacity = opacity ?? def.opacity ?? 1;
  const transparent = def.transparent || finalOpacity < 1;

  const mat = new MeshStandardMaterial({
    color: new Color(c),
    roughness: rough ?? def.rough ?? 0.8,
    metalness: metal ?? def.metal ?? 0,
    ...(map ? { map } : null),
    ...(normalMap ? { normalMap } : null),
    ...(transparent ? { transparent: true, opacity: finalOpacity } : null),
    ...(emissive ? { emissive: new Color(emissive), emissiveIntensity: emissiveIntensity ?? 1 } : null),
    ...(side != null ? { side } : null),
  });
  mat.envMapIntensity = envIntensity;

  if (CACHE.size >= MAX) {
    // Evict least-recently-used — dropping the reference only, never dispose().
    // Map preserves insertion order and we re-insert on hit, so the first key is
    // the coldest. Disposing here would be a bug: the cache cannot tell whether
    // the evicted material is still bound to a mesh that is about to be drawn,
    // and disposing a live material destroys its compiled shader program.
    CACHE.delete(CACHE.keys().next().value);
  }
  CACHE.set(key, mat);
  return mat;
}

/**
 * Set the indirect-light gain for the whole scene. Called when the lighting preset
 * changes; updates every live material in place (safe — this is the one mutation
 * the cache owns).
 */
export function setEnvIntensity(v) {
  if (v === envIntensity) return;
  envIntensity = v;
  CACHE.forEach((m) => {
    m.envMapIntensity = v;
  });
}

/** Diagnostics for the dev perf overlay. */
export function materialCacheSize() {
  return CACHE.size;
}

/** Drop everything. Only for dev reload paths — not called in normal operation. */
export function clearMaterialCache() {
  CACHE.forEach((m) => m.dispose());
  CACHE.clear();
}
