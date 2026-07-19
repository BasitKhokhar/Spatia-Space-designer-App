// ---------------------------------------------------------------------------
// 2D item thumbnail registry.
//
// Maps an item `kind` to a PNG image shown in the catalog/browse tiles instead
// of the flat vector glyph. When a kind has no entry here, the app falls back to
// the SVG glyph in FurnitureGlyph.jsx — so nothing breaks, and you upgrade items
// one at a time.
//
// The cleanest source is the SAME model you added for 3D: in Blender, after
// exporting <name>.glb, render one frame (a 3/4 or top-down view, transparent
// background) and save it as a square PNG here. Any product-style PNG works too.
//
// HOW TO ADD A THUMBNAIL
//   1. Save a square PNG (e.g. 256×256, transparent bg) as
//        src/assets/thumbs/<name>.png
//   2. Add a line below:  car: require('../../assets/thumbs/car.png'),
//   3. Reload — every catalog tile for that kind now shows the image.
// ---------------------------------------------------------------------------

// Register thumbnails here, keyed by item `kind`. Empty by default; the app
// renders vector glyphs until you drop PNGs in and uncomment.
export const THUMBS = {
  // --- vehicles ---
  // car: require('../../assets/thumbs/car.png'),

  // --- living / bedroom ---
  // sofa: require('../../assets/thumbs/sofa.png'),
  // bed: require('../../assets/thumbs/bed.png'),
  // chair: require('../../assets/thumbs/chair.png'),
  // table: require('../../assets/thumbs/table.png'),
  // tv: require('../../assets/thumbs/tv.png'),

  // --- plants / outdoor ---
  // tree: require('../../assets/thumbs/tree.png'),
  // plant: require('../../assets/thumbs/plant.png'),
};

// Returns the PNG source for a kind, or null to use the vector glyph fallback.
export function thumbFor(kind) {
  return THUMBS[kind] || null;
}
