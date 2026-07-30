// Contact-shadow decals: the soft dark pool directly under a piece of furniture.
//
// WHY NOT THE REAL SHADOW MAP
// The scene's single 1024x1024 directional shadow map is stretched to cover the
// whole building. On a 12m house that is roughly 1cm per texel at best, and much
// worse on larger plans — far too coarse to resolve the tight, dark occlusion
// right where an object meets the floor. That contact region is precisely the cue
// the eye uses to decide whether something is *resting on* the floor or *floating
// near* it, which is why the current render looks like objects hovering.
//
// So we fake it, the same way every realtime architectural viewer does: one
// translucent quad with a radial falloff, laid flat under each item. It is a
// single shared geometry, material and texture for the entire app — one extra
// draw call per item, no new shader program.

import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshBasicMaterial,
  PlaneGeometry,
  RGBAFormat,
  ClampToEdgeWrapping,
} from 'three';

import { MOUNT } from '@/data/itemEditor';

// ---------------------------------------------------------------------------
// The blob texture — generated in code, no asset file
// ---------------------------------------------------------------------------

function makeRadialAlpha(size = 64) {
  const data = new Uint8Array(size * size * 4);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - c) / c;
      const dy = (y - c) / c;
      const r = Math.min(1, Math.hypot(dx, dy));
      // smoothstep(1 -> 0) gives a soft edge; the exponent tightens the core so it
      // reads as occlusion hugging the object rather than a uniform grey disc.
      const s = 1 - r * r * (3 - 2 * r);
      const a = Math.pow(Math.max(0, s), 1.6);
      const i = (y * size + x) * 4;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = Math.round(a * 255);
    }
  }
  const tex = new DataTexture(data, size, size, RGBAFormat);
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// Module singletons — shared by every contact shadow in the scene.
export const SHADOW_TEX = makeRadialAlpha(64);

// Rotated flat at build time so the mesh itself needs no rotation prop.
export const SHADOW_GEO = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

export const SHADOW_MAT = new MeshBasicMaterial({
  map: SHADOW_TEX,
  transparent: true,
  // Must not write depth: these overlap each other and the floor, and writing
  // depth would let one blob z-fight or punch a hole in the next.
  depthWrite: false,
  color: 0x000000,
  opacity: 0.34,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  // Never let fog wash out the contact shadow — it is a fake, and a faded one
  // reads as a smudge rather than as occlusion.
  fog: false,
});

// ---------------------------------------------------------------------------
// Which items get one
// ---------------------------------------------------------------------------

// Items that hang in the air. A decal is drawn at the item's own local y=0, which
// rides *with* the item — correct for something standing on the floor, wrong for
// anything mounted up a wall or hung from the ceiling.
const NEVER = new Set([
  // already flat on the floor — a blob under a rug just darkens the rug
  'rug',
  'lawn',
  // ceiling-hung
  'pendant',
  'ceilingFan',
  'exhaustFan',
]);

/**
 * True when a placed item should get a contact-shadow decal.
 * @param {object} item a plan furniture record (see domain/floorplan.js)
 */
export function castsContactShadow(item) {
  if (!item) return false;
  // Structure pieces (room shells, walls, columns, stairs, doors, windows) carry
  // their own floor or are part of the building envelope.
  if (item.structure) return false;

  const kind = item.kind;
  if (kind && NEVER.has(kind)) return false;
  if (kind && MOUNT[kind]) return false; // tv, ac, mirror, wallShelf, sconce, ...
  if (kind && kind.startsWith('window')) return false;

  // Anything the user has deliberately lifted off the floor.
  if ((item.elevation ?? 0) > 0.05) return false;

  return true;
}

// How far the blob spreads past the item's footprint. Slightly wider than the
// object so the falloff has room to fade out instead of ending at a hard edge.
export const SHADOW_SPREAD = 1.35;
