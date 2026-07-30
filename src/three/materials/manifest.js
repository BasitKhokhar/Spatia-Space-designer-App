// Material definitions — the single source of truth for how every surface in the
// app is finished.
//
// IMPORTANT: this file must never import `three` (or anything from it).
// It is deliberately plain data so that other renderers can consume it verbatim:
// the offline thumbnail renderer (scripts/thumbs) runs in headless Chrome, and a
// future server-side photoreal renderer would run in Python. Both need these exact
// numbers to produce output that matches the app. Keep it dependency-free.
//
// FIELDS
//   group    'floor' | 'wall' | 'item' | 'roof' — used for grouping in pickers
//   base     fallback/base color when no texture is available
//   rough    roughness 0 (mirror) .. 1 (fully diffuse)
//   metal    metalness 0 (dielectric) .. 1 (metal). Omit for 0.
//   tile     [x, y] REAL-WORLD SIZE IN METRES that one texture repeat covers.
//            NOT a repeat count. A 6m floor with tile [1.2, 1.2] repeats 5 times;
//            a 1.2m nightstand repeats once. This is what lets one library serve
//            every object scale in the app without per-object tuning.
//   map      albedo texture key (see textures.js), or null for flat color
//   normal   normal map key, or omitted
//   opacity / transparent  for glass
//
// TINTING
// Every albedo texture is authored desaturated around neutral grey. three's
// standard shader multiplies `material.color` by `map`, so one grey oak texture
// tinted #7C5A3C becomes walnut. That is how ~20 textures cover 40+ finishes plus
// every user-selected item color swatch.

export const MATERIAL_DEFS = {
  // --- floors -------------------------------------------------------------
  oak: { group: 'floor', base: '#D8B98C', rough: 0.72, tile: [1.2, 1.2], map: 'wood_floor', normal: 'wood_floor_n' },
  walnut: { group: 'floor', base: '#7C5A3C', rough: 0.62, tile: [1.2, 1.2], map: 'wood_floor', normal: 'wood_floor_n' },
  ash: { group: 'floor', base: '#BBB4A8', rough: 0.85, tile: [1.2, 1.2], map: 'wood_floor', normal: 'wood_floor_n' },
  tile: { group: 'floor', base: '#D3D8DB', rough: 0.35, tile: [0.6, 0.6], map: 'tile_sq' },
  marble: { group: 'floor', base: '#E6E2DB', rough: 0.16, tile: [2.4, 2.4], map: 'marble' },
  concrete: { group: 'floor', base: '#A9A8A4', rough: 0.9, tile: [2.0, 2.0], map: 'concrete' },
  carpet: { group: 'floor', base: '#B49C90', rough: 1.0, tile: [0.8, 0.8], map: 'carpet', normal: 'carpet_n' },
  terracotta: { group: 'floor', base: '#C07A54', rough: 0.85, tile: [0.5, 0.5], map: 'tile_sq' },

  // --- walls --------------------------------------------------------------
  plaster: { group: 'wall', base: '#FFFFFF', rough: 0.94, tile: [2.0, 2.0], map: 'plaster' },
  brick: { group: 'wall', base: '#B4705A', rough: 0.9, tile: [1.0, 1.0], map: 'brick', normal: 'brick_n' },
  // Flat paint — no texture at all. The default for walls and for any builder
  // part that has not been given a specific material.
  paint: { group: 'wall', base: '#FFFFFF', rough: 0.9, map: null },

  // --- item finishes ------------------------------------------------------
  wood: { group: 'item', base: '#FFFFFF', rough: 0.6, tile: [0.8, 0.8], map: 'wood' },
  fabric: { group: 'item', base: '#FFFFFF', rough: 0.95, tile: [0.35, 0.35], map: 'fabric', normal: 'fabric_n' },
  leather: { group: 'item', base: '#FFFFFF', rough: 0.55, tile: [0.5, 0.5], map: 'leather', normal: 'leather_n' },
  metal: { group: 'item', base: '#FFFFFF', rough: 0.32, metal: 0.85, map: null },
  chrome: { group: 'item', base: '#DFE3E6', rough: 0.12, metal: 1.0, map: null },
  glass: { group: 'item', base: '#9FC4DC', rough: 0.05, metal: 0, map: null, transparent: true, opacity: 0.32 },
  plastic: { group: 'item', base: '#FFFFFF', rough: 0.45, map: null },
  // No texture shipped yet — renders as flat color until one is added to the
  // registry, which is the intended graceful-degradation path for every material.
  stone: { group: 'item', base: '#FFFFFF', rough: 0.75, tile: [1.0, 1.0], map: null },
  // Emissive-ish soft surfaces (lampshades, screens) still use paint + the
  // builder's own emissive props; no separate def needed.

  // --- roof (unused until roof geometry lands, kept for manifest parity) ---
  shingle: { group: 'roof', base: '#6B6560', rough: 0.88, tile: [1.0, 1.0], map: null },
  clayTile: { group: 'roof', base: '#B5603C', rough: 0.8, tile: [1.0, 1.0], map: null },
};

// The material used when a builder asks for one that doesn't exist. Never throw
// in the render path — a wrong-looking mesh beats a blank canvas.
export const DEFAULT_MATERIAL = 'paint';

export function materialDef(id) {
  return MATERIAL_DEFS[id] || MATERIAL_DEFS[DEFAULT_MATERIAL];
}

// Real-world tile size for a material, or null when it should not be tiled
// (untextured finishes, and curved geometry where UVs stay 0..1).
export function tileOf(id) {
  return MATERIAL_DEFS[id]?.tile || null;
}
