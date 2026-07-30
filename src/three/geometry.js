// Shared BufferGeometry cache, with real-world UV tiling baked in.
//
// TWO PROBLEMS, ONE SOLUTION
//
// 1. Allocation. Every <boxGeometry args={...}> in models.jsx built a fresh
//    BufferGeometry. A furnished two-floor plan allocated well over a thousand.
//
// 2. Tiling. Texture `repeat` lives on THREE.Texture, not on the material. Since
//    textures are shared app-wide (they must be — cloning one forces a second GPU
//    upload of the same image), we cannot set a per-surface repeat there.
//
// Both are solved by caching geometry keyed on its dimensions AND scaling the UVs
// at build time so that one texture repeat covers a fixed real-world size. A 6m
// wide floor and a 1.2m nightstand then get correctly-scaled wood grain from the
// same texture object, with no runtime cost at all.

import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  PlaneGeometry,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three';

const CACHE = new Map();

// Sized so a realistic scene never evicts. A furnished two-floor plan can ask for
// well over a thousand distinct box sizes (every builder derives its parts from
// the item's own w/d/h), and a cap below that would thrash — rebuilding geometry
// every frame, which is worse than having no cache at all. Each cached box is
// under a kilobyte of CPU-side attribute data, so a generous cap is cheap.
const MAX = 4000;

// Quantise dimensions so near-identical sizes share one geometry. 1mm is far
// below anything visible and turns a long tail of unique sizes into a small set.
const q = (n) => Math.round((n ?? 0) * 1000) / 1000;

function remember(key, build) {
  const hit = CACHE.get(key);
  if (hit) {
    CACHE.delete(key);
    CACHE.set(key, hit);
    return hit;
  }
  const geo = build();
  if (CACHE.size >= MAX) {
    // Evict by dropping the reference ONLY — never dispose().
    //
    // The cache has no idea whether the evicted geometry is still attached to a
    // live mesh somewhere in the scene, and disposing one that is frees its GPU
    // buffers out from under a mesh that is about to be drawn. Dropping the
    // reference is always safe: anything still in use stays alive through that
    // reference, and anything genuinely unused becomes garbage as normal.
    CACHE.delete(CACHE.keys().next().value);
  }
  CACHE.set(key, geo);
  return geo;
}

// ---------------------------------------------------------------------------
// Box, with per-face UV scaling
// ---------------------------------------------------------------------------

// BoxGeometry emits 6 face groups, each with UVs spanning 0..1. To tile at a
// real-world size we scale each face's UVs by that face's own dimensions. Face
// order is +X, -X, +Y, -Y, +Z, -Z, and each face's (u, v) maps to a specific pair
// of box dimensions — hence the table below.
function scaleBoxUVs(geo, w, h, d, tile) {
  const uv = geo.attributes.uv;
  if (!uv || !tile) return geo;
  const [tx, ty] = tile;
  if (!tx || !ty) return geo;

  // [uSize, vSize] in metres for each of the 6 faces, in three's face order.
  const faces = [
    [d, h], // +X
    [d, h], // -X
    [w, d], // +Y
    [w, d], // -Y
    [w, h], // +Z
    [w, h], // -Z
  ];

  // Each face is 4 vertices in a non-indexed-looking layout of 6 groups.
  const perFace = uv.count / 6;
  for (let f = 0; f < 6; f++) {
    const su = faces[f][0] / tx;
    const sv = faces[f][1] / ty;
    for (let i = 0; i < perFace; i++) {
      const idx = f * perFace + i;
      uv.setXY(idx, uv.getX(idx) * su, uv.getY(idx) * sv);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Shared box geometry. `tile` is [x, y] real-world metres per texture repeat
 * (from manifest.js), or null/undefined to leave UVs at 0..1.
 */
export function boxGeo(w, h, d, tile) {
  const key = `b|${q(w)}|${q(h)}|${q(d)}|${tile ? `${q(tile[0])},${q(tile[1])}` : '-'}`;
  return remember(key, () => scaleBoxUVs(new BoxGeometry(w, h, d), w, h, d, tile));
}

// ---------------------------------------------------------------------------
// Cylinder / sphere
// ---------------------------------------------------------------------------

// Deliberately no UV scaling on curved geometry: these are table legs, lampshades,
// pot plants and wheels. Their UVs are already an awkward cylindrical unwrap, and
// nobody can perceive tiling scale on a 4cm leg.

export function cylGeo(rTop, rBottom, h, seg = 16) {
  const key = `c|${q(rTop)}|${q(rBottom)}|${q(h)}|${seg}`;
  return remember(key, () => new CylinderGeometry(rTop, rBottom, h, seg));
}

export function sphereGeo(r, ws = 16, hs = 12) {
  const key = `s|${q(r)}|${ws}|${hs}`;
  return remember(key, () => new SphereGeometry(r, ws, hs));
}

// Lampshades and similar. `open` leaves the cone end-capped or not, which matters
// for shades you can see up into.
export function coneGeo(r, h, seg = 24, open = false) {
  const key = `n|${q(r)}|${q(h)}|${seg}|${open ? 1 : 0}`;
  return remember(key, () => new ConeGeometry(r, h, seg, 1, open));
}

// Handrails, hanging-rail hoops.
export function torusGeo(r, tube, radialSeg = 8, tubularSeg = 24, arc) {
  const key = `t|${q(r)}|${q(tube)}|${radialSeg}|${tubularSeg}|${arc == null ? '-' : q(arc)}`;
  return remember(key, () =>
    arc == null
      ? new TorusGeometry(r, tube, radialSeg, tubularSeg)
      : new TorusGeometry(r, tube, radialSeg, tubularSeg, arc)
  );
}

// ---------------------------------------------------------------------------
// Shape (floor / ceiling polygons)
// ---------------------------------------------------------------------------

/**
 * Shared geometry for a polygon floor slab.
 *
 * ShapeGeometry generates uv = (x, y) directly from the shape's own coordinates,
 * which for our plans are already in METRES. So tiling is just a divide — no
 * remapping needed. `keyHint` must uniquely identify the shape's outline (callers
 * pass the point list), since a THREE.Shape has no stable identity of its own.
 */
export function shapeGeo(shape, keyHint, tile) {
  const key = `p|${keyHint}|${tile ? `${q(tile[0])},${q(tile[1])}` : '-'}`;
  return remember(key, () => {
    const geo = new ShapeGeometry(shape);
    const uv = geo.attributes.uv;
    if (uv && tile && tile[0] && tile[1]) {
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) / tile[0], uv.getY(i) / tile[1]);
      }
      uv.needsUpdate = true;
    }
    return geo;
  });
}

/**
 * Rectangular floor / ceiling slab. PlaneGeometry UVs span 0..1, so tiling is a
 * straight multiply by the plane's real-world size over the tile size.
 */
export function planeGeo(w, l, tile) {
  const key = `pl|${q(w)}|${q(l)}|${tile ? `${q(tile[0])},${q(tile[1])}` : '-'}`;
  return remember(key, () => {
    const geo = new PlaneGeometry(w, l);
    const uv = geo.attributes.uv;
    if (uv && tile && tile[0] && tile[1]) {
      const su = w / tile[0];
      const sv = l / tile[1];
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
      }
      uv.needsUpdate = true;
    }
    return geo;
  });
}

/** Diagnostics for the dev perf overlay. */
export function geometryCacheSize() {
  return CACHE.size;
}

export function clearGeometryCache() {
  CACHE.forEach((g) => g.dispose());
  CACHE.clear();
}
