// Turns a freshly-parsed Kenney .glb into something the app can actually render.
//
// THE PROBLEM
// Every model in the kit declares KHR_materials_unlit and carries no textures.
// three honours the extension and renders them with an unlit basic material:
// flat colour, no shading, no shadows, no environment response. Dropped into the
// scene as-authored they look worse than the procedural boxes they replace.
//
// WHAT THIS DOES, ONCE PER MODEL
//   1. Flattens node transforms into the geometry (every Kenney model has at
//      least one, and 43 of the 140 have multiple mesh nodes), so everything
//      afterwards can work in a single local space.
//   2. Replaces each material with one from the shared library, chosen by the
//      GLB's own material NAME — see materials/kenneyMap.js for why that works.
//   3. Records which slot owns the user's colour swatch, for ModelItem to apply
//      per instance.
//
// UV regeneration is deliberately NOT done here: it depends on the auto-fit
// scale, which is per-placement. See projectedGeometry() at the bottom.

import { BufferAttribute } from 'three';

import { getMaterial } from './materials/library';
import { tileOf } from './materials/manifest';
import { kenneyMaterial, primarySlot } from './materials/kenneyMap';

// Mirrors the helper in models.jsx. Duplicated rather than imported because
// models.jsx imports ModelItem, which imports this file — and a circular import
// through Metro's module graph is not worth saving six lines.
export function shade(hex, f) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (Number.isNaN(n)) return hex;
  const r = Math.round(Math.min(255, Math.max(0, ((n >> 16) & 255) * f)));
  const g = Math.round(Math.min(255, Math.max(0, ((n >> 8) & 255) * f)));
  const b = Math.round(Math.min(255, Math.max(0, (n & 255) * f)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// How much darker a `derives` slot sits below the slot it companions. Matches
// the shade() factors the procedural builders already use for their own
// two-tone parts, so a modelled cabinet and a procedural one read alike.
const DERIVED_FACTOR = 0.78;

// gltf object -> prepared descriptor. WeakMap so a model dropped from the loader
// cache does not keep its prepared form alive.
const PREPARED = new WeakMap();

// Separate cache/prep path for catalog-downloaded (Poly Haven/Quaternius)
// models. Unlike the Kenney kit, these carry real PBR materials and textures
// baked in by the asset pipeline (scripts/models/pipeline/) — the whole point
// of using them — so they skip the material-substitution and colour-slot
// system entirely and keep their own materials as authored. A remote item
// therefore doesn't respond to the user's colour swatch; that trade-off is
// already accepted for bundled Kenney items via their PNG catalog thumbnails
// (see itemThumbs.js).
const PREPARED_REMOTE = new WeakMap();

/**
 * Prepare a parsed remote glTF for rendering: bake node transforms into
 * geometry (same reason as prepareModel — everything downstream works in one
 * flat space), fill in missing normals, enable shadows. Materials/textures
 * are left untouched.
 *
 * @param {object} gltf result of GLTFLoader.parse / loadAsync
 * @returns {{ root: import('three').Object3D }}
 */
export function prepareRemoteModel(gltf) {
  const hit = PREPARED_REMOTE.get(gltf);
  if (hit) return hit;

  const root = gltf.scene;
  root.updateMatrixWorld(true);

  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });

  meshes.forEach((mesh) => {
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    mesh.geometry.dispose();
    mesh.geometry = geo;
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    mesh.updateMatrix();

    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });

  root.traverse((o) => {
    if (o !== root && !o.isMesh) {
      o.position.set(0, 0, 0);
      o.quaternion.identity();
      o.scale.set(1, 1, 1);
      o.updateMatrix();
    }
  });
  root.position.set(0, 0, 0);
  root.quaternion.identity();
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);

  const prepared = { root };
  PREPARED_REMOTE.set(gltf, prepared);
  return prepared;
}

/**
 * Prepare a parsed glTF for rendering. Idempotent and cached — the returned
 * `root` is the canonical prepared scene, which ModelItem clones per placement.
 *
 * @param {object} gltf result of GLTFLoader.parse
 * @returns {{ root: import('three').Object3D, primary: string|null }}
 */
export function prepareModel(gltf) {
  const hit = PREPARED.get(gltf);
  if (hit) return hit;

  const root = gltf.scene;
  root.updateMatrixWorld(true);

  // Pass 1 — collect the material names present, so the primary slot is decided
  // for the model as a whole rather than mesh by mesh.
  const names = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (m?.name) names.push(m.name);
    });
  });
  const primary = primarySlot(names);

  // Pass 2 — bake transforms, retarget materials, record slots.
  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });

  meshes.forEach((mesh) => {
    // Bake the node's world transform into a private copy of the geometry, then
    // neutralise the node. Kenney models are 28-600 triangles, so cloning is
    // cheap, and it means every downstream step (UV projection, bounding box)
    // works in one flat space.
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    // The loader's geometry is now orphaned — nothing else references a parsed
    // GLB's buffers once we hold a baked copy.
    mesh.geometry.dispose();
    mesh.geometry = geo;
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    mesh.updateMatrix();

    const originals = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const slots = originals.map((m) => {
      const name = m?.name || '_defaultMat';
      const def = kenneyMaterial(name);
      return { name, def, isPrimary: name === primary, derivesFromPrimary: def.derives === primary };
    });

    // Assign the natural-tint material now. Instances only override the slots
    // that respond to the item's colour, so a mesh always has a correct,
    // shared, lit material even if nothing overrides it.
    const built = slots.map((s) => materialFor(s.def, s.def.tint));
    mesh.material = Array.isArray(mesh.material) ? built : built[0];
    mesh.userData.slots = slots;

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Kenney authors single-sided geometry with correct winding; keeping the
    // default FrontSide halves the fragment work on every one of these meshes.
    mesh.frustumCulled = true;

    // The unlit materials that came out of the loader are per-model, not shared,
    // and are now unreachable. Free their GPU resources rather than waiting for
    // the loader cache to be dropped.
    originals.forEach((m) => m?.dispose?.());
  });

  // The node transforms are baked into geometry now, so clear the parents too —
  // otherwise a group transform would be applied a second time.
  root.traverse((o) => {
    if (o !== root && !o.isMesh) {
      o.position.set(0, 0, 0);
      o.quaternion.identity();
      o.scale.set(1, 1, 1);
      o.updateMatrix();
    }
  });
  root.position.set(0, 0, 0);
  root.quaternion.identity();
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);

  const prepared = { root, primary };
  PREPARED.set(gltf, prepared);
  return prepared;
}

/** Build (or fetch from the shared cache) the material for one slot. */
export function materialFor(def, color) {
  return getMaterial({
    id: def.id,
    color,
    rough: def.rough,
    metal: def.metal,
    emissive: def.emissive,
    emissiveIntensity: def.emissiveIntensity,
  });
}

/**
 * The colour a slot should use for a given placement.
 * Returns null when the slot is unaffected by the item's swatch, so the caller
 * can skip the override entirely and keep the prepared material.
 */
export function slotColor(slot, itemColor) {
  if (!itemColor) return null;
  if (slot.isPrimary) return itemColor;
  if (slot.derivesFromPrimary) return shade(itemColor, DERIVED_FACTOR);
  return null;
}

// ---------------------------------------------------------------------------
// UV projection
// ---------------------------------------------------------------------------

// Kenney's own TEXCOORD_0 is useless for tiling — measured ranges run
// U[-71.8, 71.8], V[-51.7, 1.0], because the kit was authored against a colour
// palette atlas rather than a repeating texture. Applying a wood grain through
// those UVs produces high-frequency noise. So we throw them away and box-project
// new ones at the same real-world scale the rest of the app uses (manifest.js
// `tile` = metres per repeat), which is what makes a modelled table's grain
// match the floor it stands on.

const UV_CACHE = new Map();
// Bounded by (models on screen) x (distinct fit scales), not by placement count.
const UV_MAX = 1200;

// Quantise the fit scale so a 1.58m and a 1.62m sofa share one geometry. The
// grain-scale difference across a bucket is far below what anyone can see, and
// without this every item size would allocate its own copy.
const qScale = (s) => Math.round(s * 20) / 20;

function boxProjectUVs(geo, tile, s) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const [tx, ty] = tile;
  const uv = new Float32Array(pos.count * 2);

  for (let i = 0; i < pos.count; i++) {
    // Project in FINAL world metres: the model is about to be scaled by `s`, and
    // tiling is defined in real-world size.
    const x = pos.getX(i) * s;
    const y = pos.getY(i) * s;
    const z = pos.getZ(i) * s;

    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));

    // Pick the plane the face is most parallel to, so the texture is never
    // smeared along a steep face.
    let u;
    let v;
    if (nx >= ny && nx >= nz) {
      u = z;
      v = y;
    } else if (ny >= nx && ny >= nz) {
      u = x;
      v = z;
    } else {
      u = x;
      v = y;
    }

    uv[i * 2] = u / tx;
    uv[i * 2 + 1] = v / ty;
  }

  const attr = new BufferAttribute(uv, 2);
  geo.setAttribute('uv', attr);
  // aoMap reads uv1. Sharing the same attribute object is intentional — it is
  // the same projection, and a second copy would be pure waste.
  geo.setAttribute('uv1', attr);
  return geo;
}

/**
 * Geometry with box-projected, real-world-scaled UVs for a given material and
 * fit scale. Returns `base` untouched for materials that carry no texture
 * (metal, chrome, glass, paint) — projecting UVs they never sample is wasted
 * memory.
 *
 * @param {import('three').BufferGeometry} base prepared, transform-baked geometry
 * @param {string} materialId key into MATERIAL_DEFS
 * @param {number} scale uniform fit scale about to be applied to the model
 */
export function projectedGeometry(base, materialId, scale) {
  const tile = tileOf(materialId);
  if (!tile || !base?.attributes?.position) return base;

  const s = qScale(scale) || 1;
  const key = `${base.uuid}|${materialId}|${s}`;

  const hit = UV_CACHE.get(key);
  if (hit) {
    UV_CACHE.delete(key);
    UV_CACHE.set(key, hit);
    return hit;
  }

  const geo = boxProjectUVs(base.clone(), tile, s);

  if (UV_CACHE.size >= UV_MAX) {
    // Drop the reference only, never dispose() — the same rule as geometry.js.
    // The cache cannot know whether the evicted geometry is still bound to a
    // mesh that is about to be drawn, and disposing one that is frees its GPU
    // buffers out from under it.
    UV_CACHE.delete(UV_CACHE.keys().next().value);
  }
  UV_CACHE.set(key, geo);
  return geo;
}

/** Diagnostics for the dev perf overlay. */
export function uvCacheSize() {
  return UV_CACHE.size;
}
