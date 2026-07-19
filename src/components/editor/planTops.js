// ---------------------------------------------------------------------------
// Top-down plan image registry (2D floor-plan canvas).
//
// Maps an item `kind` to a TOP-DOWN PNG drawn on the editor canvas in place of
// the flat colored box. When a kind has no entry, the canvas falls back to the
// existing rounded-rect + front-tick vector — so nothing breaks.
//
// These are DIFFERENT images from src/assets/thumbs (those are 3/4 tile art).
// A plan image is the object seen straight from above, so a car reads as a car
// roof/hood from the top. Render it in Blender from a top orthographic camera
// with a transparent background, square PNG.
//
// IMPORTANT: the image's "front" must point UP (toward -Y / top of the image).
// The canvas rotates it by the item's rotation, matching the vector's front tick.
//
// HOW TO ADD ONE
//   1. Save a square top-down PNG as  src/assets/tops/<name>.png
//   2. Add a line below:  car: require('../../assets/tops/car.png'),
//   3. Reload the editor — placed items of that kind draw the image.
// ---------------------------------------------------------------------------

// Register top-down images here, keyed by item `kind`. Empty by default.
export const PLAN_TOPS = {
  // car: require('../../assets/tops/car.png'),
  // sofa: require('../../assets/tops/sofa.png'),
  // bed: require('../../assets/tops/bed.png'),
  // table: require('../../assets/tops/table.png'),
  // tree: require('../../assets/tops/tree.png'),
};

// Returns the top-down PNG source for a kind, or null for the vector fallback.
export function planTopFor(kind) {
  return PLAN_TOPS[kind] || null;
}
