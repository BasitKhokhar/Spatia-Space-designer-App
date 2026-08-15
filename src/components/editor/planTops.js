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

// Register top-down images here, keyed by item `kind`. Generic per-kind icons
// below are rendered from the bundled Kenney kit by
// scripts/models/render-plan-tops.mjs (one-off, not part of the runtime asset
// pipeline) — re-run it and re-commit the PNGs if src/three/modelRegistry.js's
// MODELS table (kind -> Kenney base name) changes. A placed item with a
// per-product photo (catalogItem.planTopUrl, from the CC0 asset pipeline)
// draws that instead — see FurnitureShape.jsx's priority order.
export const PLAN_TOPS = {
  sofa: require('../../assets/tops/sofa.png'),
  sectional: require('../../assets/tops/sectional.png'),
  chair: require('../../assets/tops/chair.png'),
  stool: require('../../assets/tops/stool.png'),
  bench: require('../../assets/tops/bench.png'),
  table: require('../../assets/tops/table.png'),
  roundTable: require('../../assets/tops/roundTable.png'),
  desk: require('../../assets/tops/desk.png'),
  nightstand: require('../../assets/tops/nightstand.png'),
  bed: require('../../assets/tops/bed.png'),
  wardrobe: require('../../assets/tops/wardrobe.png'),
  dresser: require('../../assets/tops/dresser.png'),
  bookshelf: require('../../assets/tops/bookshelf.png'),
  shelfUnit: require('../../assets/tops/shelfUnit.png'),
  cabinet: require('../../assets/tops/cabinet.png'),
  tvStand: require('../../assets/tops/tvStand.png'),
  wallShelf: require('../../assets/tops/wallShelf.png'),
  counter: require('../../assets/tops/counter.png'),
  island: require('../../assets/tops/island.png'),
  stove: require('../../assets/tops/stove.png'),
  fridge: require('../../assets/tops/fridge.png'),
  sink: require('../../assets/tops/sink.png'),
  bathtub: require('../../assets/tops/bathtub.png'),
  shower: require('../../assets/tops/shower.png'),
  toilet: require('../../assets/tops/toilet.png'),
  mirror: require('../../assets/tops/mirror.png'),
  lamp: require('../../assets/tops/lamp.png'),
  pendant: require('../../assets/tops/pendant.png'),
  sconce: require('../../assets/tops/sconce.png'),
  ceilingFan: require('../../assets/tops/ceilingFan.png'),
  tv: require('../../assets/tops/tv.png'),
  plant: require('../../assets/tops/plant.png'),
  planter: require('../../assets/tops/planter.png'),
  rug: require('../../assets/tops/rug.png'),
  crate: require('../../assets/tops/crate.png'),
  bin: require('../../assets/tops/bin.png'),
  displayCase: require('../../assets/tops/displayCase.png'),
};

// Returns the top-down PNG source for a kind, or null for the vector fallback.
export function planTopFor(kind) {
  return PLAN_TOPS[kind] || null;
}
