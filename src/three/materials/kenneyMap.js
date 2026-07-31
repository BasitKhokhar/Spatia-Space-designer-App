// Kenney Furniture Kit -> app material library.
//
// WHY THIS FILE EXISTS
// Every model in the kit declares KHR_materials_unlit and ships NO textures at
// all — just a `baseColorFactor` per material. Loaded as-authored, three renders
// them with an unlit basic material: flat cartoon colour, no shading, no
// shadows, no response to the environment map. That looks WORSE than the
// procedural boxes it is meant to replace.
//
// What the kit does give us is a **named** material slot on every mesh, drawn
// from a fixed 15-name palette shared across all 140 models (verified by parsing
// every .glb). Those names map almost 1:1 onto MATERIAL_DEFS, so the fix is to
// throw the GLB's material away and substitute one of ours — keeping the
// geometry, gaining the albedo texture, normal map, roughness and IBL response.
//
// Kept dependency-free (no `three`, no imports) for the same reason as
// manifest.js: the offline thumbnail renderer consumes it verbatim.

// Observed usage across the kit, for reference when tuning:
//   wood 89, metal 59, metalDark 33, carpet 23, _defaultMat 21, metalMedium 19,
//   glass 18, carpetWhite 17, woodDark 15, metalLight 15, lamp 7, carpetBlue 7,
//   carpetDarker 5, plant 5, fur 1
//
// FIELDS
//   id       key into MATERIAL_DEFS (manifest.js)
//   tint     natural colour used when this slot is not the item's primary. These
//            are the app's own palette constants, NOT Kenney's raw values —
//            Kenney authored for an unlit cartoon look (#f15e57 coral, #2ed193
//            neon green) which reads as a toy once real lighting is applied.
//   derives  when this slot is a darker companion of another slot, the name of
//            that base. If the base is the primary, this slot is shaded from the
//            user's colour instead of using `tint`, so two-tone models stay
//            two-tone (a walnut cabinet keeps its darker doors).
//   rough / metal / emissive  optional overrides passed straight to getMaterial.
export const KENNEY_MATERIALS = {
  // --- soft / upholstery -------------------------------------------------
  carpet: { id: 'fabric', tint: '#BC5B3A' },
  carpetBlue: { id: 'fabric', tint: '#3E4A5C' },
  carpetDarker: { id: 'fabric', tint: '#8A4234', derives: 'carpet' },
  carpetWhite: { id: 'fabric', tint: '#EDE7DC' },
  fur: { id: 'carpet', tint: '#A5754C' },

  // --- wood ---------------------------------------------------------------
  wood: { id: 'wood', tint: '#8A6250' },
  woodDark: { id: 'wood', tint: '#6E5240', derives: 'wood' },

  // --- metal / glass ------------------------------------------------------
  metal: { id: 'metal', tint: '#9AA0A6' },
  metalMedium: { id: 'metal', tint: '#7A8087', derives: 'metal' },
  metalDark: { id: 'metal', tint: '#5A5F64', derives: 'metal' },
  // Bright trim, taps, handles — reads as polished rather than brushed.
  metalLight: { id: 'chrome', tint: '#DFE3E6' },
  glass: { id: 'glass', tint: '#9FC4DC' },

  // --- special ------------------------------------------------------------
  // Lamp shades and lit panels. Emissive so they read as light sources in the
  // evening/night presets, matching what the procedural Lamp builder does.
  lamp: { id: 'paint', tint: '#FFE9B8', emissive: '#FFD8A0', emissiveIntensity: 0.55, rough: 0.6 },
  // Foliage stays green regardless of the item's colour swatch — a user picking
  // a terracotta planter does not want terracotta leaves.
  plant: { id: 'paint', tint: '#4E7C59', rough: 0.85 },

  // Kenney's catch-all. Appears on 21 models, usually as a neutral shell.
  _defaultMat: { id: 'paint', tint: '#E8E3D9' },
};

// Which slot receives the user's colour swatch (item.color).
//
// Exactly ONE slot per model takes it. Tinting every slot turns a two-tone bed
// into a monochrome slab; tinting none makes the catalog's colour swatches do
// nothing. The order below is "what would a person call this object's colour?" —
// upholstery first, then wood, then the neutral shell, with metal as a last
// resort so something always responds (a TV's body, a bar stool's frame).
const PRIMARY_PRIORITY = [
  'carpet',
  'carpetBlue',
  'carpetDarker',
  'fur',
  'carpetWhite',
  'wood',
  '_defaultMat',
  'metalDark',
  'metal',
];

/**
 * Look up a Kenney material name. Unknown names fall back to a neutral painted
 * surface rather than throwing — a slightly plain mesh beats a blank canvas.
 */
export function kenneyMaterial(name) {
  return KENNEY_MATERIALS[name] || KENNEY_MATERIALS._defaultMat;
}

/**
 * Given every material name present in one model, decide which slot owns the
 * item's colour swatch.
 *
 * @param {string[]} names material names found on the model's meshes
 * @returns {string|null} the winning name, or null when no slot should be tinted
 */
export function primarySlot(names) {
  const present = new Set(names);
  return PRIMARY_PRIORITY.find((n) => present.has(n)) || null;
}
