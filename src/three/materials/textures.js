// Texture registry and cache.
//
// LOADING ON REACT NATIVE
// Use plain THREE.TextureLoader with a require()'d module ref. @react-three/fiber's
// native entry already replaces TextureLoader.prototype.load with an RN-correct
// implementation that understands Metro asset module numbers, so no extra
// dependency (and specifically not expo-three, whose competing polyfill patches
// the same prototype) is needed.
//
// HARD CONSTRAINTS ON THIS PLATFORM
//   * JPEG and PNG only. expo-gl compiles stb_image with STBI_ONLY_JPEG /
//     STBI_ONLY_PNG — a WebP texture fails SILENTLY and renders black.
//   * No KTX2/Basis/ETC2: the transcoder needs WebAssembly, and Hermes has none.
//     Control texture memory with pixel size instead of compression.
//   * Albedo maps must be SRGBColorSpace; normal/roughness/AO must NOT be, or the
//     lighting maths is applied to gamma-encoded data and comes out wrong.
//   * load() returns an empty texture synchronously and fills in later. Under
//     frameloop="demand" that means nothing repaints when it arrives — hence the
//     onLoad -> invalidate() hook below.

import { TextureLoader, SRGBColorSpace, NoColorSpace, RepeatWrapping } from 'three';

// ---------------------------------------------------------------------------
// The file registry
// ---------------------------------------------------------------------------
// Keys are referenced by `map` / `normal` in manifest.js. Uncomment a line once
// the matching file exists in src/assets/textures/. Until then getTexture()
// returns null and materials fall back to flat color — so the app renders
// correctly at every point during the texture rollout, and a missing file is a
// slightly plainer surface rather than a black one.
//
// SOURCING (all CC0 — free for commercial use, no attribution required):
//   ambientCG   https://ambientcg.com     <- primary; download 1K, resize to 512
//   Poly Haven  https://polyhaven.com/textures
//   CGBookcase  https://cgbookcase.com
// Pipeline per texture: download 1K -> resize 512x512 -> albedo desaturated toward
// neutral grey (so material.color tinting works) -> save as JPEG q80.
// Normal maps stay PNG (JPEG artifacts show up badly in normals).
const FILES = {
  // --- albedo, 512x512 JPEG, sRGB ---
  wood_floor: require('@/assets/textures/wood_floor.jpg'),
  wood_plank: require('@/assets/textures/wood_plank.jpg'),
  wood_herringbone: require('@/assets/textures/wood_herringbone.jpg'),
  wood: require('@/assets/textures/wood.jpg'),
  tile_sq: require('@/assets/textures/tile_sq.jpg'),
  marble: require('@/assets/textures/marble.jpg'),
  concrete: require('@/assets/textures/concrete.jpg'),
  carpet: require('@/assets/textures/carpet.jpg'),
  plaster: require('@/assets/textures/plaster.jpg'),
  brick: require('@/assets/textures/brick.jpg'),
  fabric: require('@/assets/textures/fabric.jpg'),
  leather: require('@/assets/textures/leather.jpg'),
  stone: require('@/assets/textures/stone.jpg'),

  // --- normal maps, 256x256 PNG, linear ---
  // Only shipped where the source actually has measurable relief. Wood066, the
  // tile and plaster all measured essentially flat, so their normals were dropped
  // rather than shipped as dead weight — see scripts/textures/build-textures.mjs.
  wood_floor_n: require('@/assets/textures/wood_floor_n.png'),
  wood_plank_n: require('@/assets/textures/wood_plank_n.png'),
  wood_herringbone_n: require('@/assets/textures/wood_herringbone_n.png'),
  carpet_n: require('@/assets/textures/carpet_n.png'),
  brick_n: require('@/assets/textures/brick_n.png'),
  fabric_n: require('@/assets/textures/fabric_n.png'),
  leather_n: require('@/assets/textures/leather_n.png'),
  stone_n: require('@/assets/textures/stone_n.png'),

  // --- packed ORM, 256x256 JPEG, linear ---
  // R = ambient occlusion, G = roughness, B = metalness. One texture drives
  // aoMap + roughnessMap + metalnessMap, so per-pixel roughness — the thing that
  // stops a surface reading as plastic — costs ~25KB instead of three maps.
  wood_floor_orm: require('@/assets/textures/wood_floor_orm.jpg'),
  wood_plank_orm: require('@/assets/textures/wood_plank_orm.jpg'),
  wood_herringbone_orm: require('@/assets/textures/wood_herringbone_orm.jpg'),
  wood_orm: require('@/assets/textures/wood_orm.jpg'),
  tile_sq_orm: require('@/assets/textures/tile_sq_orm.jpg'),
  marble_orm: require('@/assets/textures/marble_orm.jpg'),
  concrete_orm: require('@/assets/textures/concrete_orm.jpg'),
  carpet_orm: require('@/assets/textures/carpet_orm.jpg'),
  plaster_orm: require('@/assets/textures/plaster_orm.jpg'),
  brick_orm: require('@/assets/textures/brick_orm.jpg'),
  fabric_orm: require('@/assets/textures/fabric_orm.jpg'),
  leather_orm: require('@/assets/textures/leather_orm.jpg'),
  stone_orm: require('@/assets/textures/stone_orm.jpg'),
};

// Keys with these suffixes hold measurements, not colour, and must stay linear —
// running them through the sRGB decode would apply a gamma curve to surface
// slopes and roughness values and quietly break the lighting maths.
const isLinearKey = (key) => key.endsWith('_n') || key.endsWith('_orm');

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const CACHE = new Map(); // key -> THREE.Texture
let loader = null;

// Set by the 3D view so a texture arriving after first paint still triggers a
// repaint under frameloop="demand".
let onTextureLoaded = null;
export function setTextureInvalidator(fn) {
  onTextureLoaded = fn;
}

/**
 * Get a shared texture by registry key. Returns null when the key is unknown or
 * its file has not been added yet — callers must treat null as "no map".
 *
 * Textures are shared app-wide and never disposed; `repeat` is deliberately NOT
 * set here. Per-surface tiling is baked into geometry UVs instead (see
 * three/geometry.js), because repeat lives on the Texture and would otherwise
 * force a separate texture — and a separate GPU upload — per surface size.
 */
export function getTexture(key) {
  if (!key) return null;
  const cached = CACHE.get(key);
  if (cached !== undefined) return cached;

  const mod = FILES[key];
  if (!mod) {
    CACHE.set(key, null); // negative-cache so we don't re-check every frame
    return null;
  }

  if (!loader) loader = new TextureLoader();

  let tex = null;
  try {
    tex = loader.load(
      mod,
      () => {
        if (onTextureLoaded) onTextureLoaded();
      },
      undefined,
      (err) => {
        console.warn(`[3D] texture "${key}" failed to load:`, err?.message || err);
      }
    );
    tex.colorSpace = isLinearKey(key) ? NoColorSpace : SRGBColorSpace;
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    // Anisotropic filtering is the single biggest sharpness win in this app:
    // floors are almost always viewed at a grazing angle, where isotropic
    // mipmapping blurs the grain into mush a couple of metres out. 8 is well
    // within every GLES3 driver's max (typically 16) and costs only sample
    // bandwidth on the surfaces that actually need it.
    tex.anisotropy = 8;
  } catch (e) {
    console.warn(`[3D] texture "${key}" threw on load:`, e?.message || e);
    tex = null;
  }

  CACHE.set(key, tex);
  return tex;
}

/** True when at least one texture file has been registered. Diagnostics only. */
export function texturesAvailable() {
  return Object.keys(FILES).length > 0;
}
