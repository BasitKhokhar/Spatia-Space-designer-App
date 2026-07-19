// ---------------------------------------------------------------------------
// Real 3D model registry.
//
// This maps an item `kind` (from src/data/catalog.js) to a bundled `.glb` file.
// When a kind has an entry here, the 3D view loads that artist-made model and
// auto-fits it to the item's size. When it doesn't, the app falls back to the
// procedural box/cylinder model in models.jsx — so the app always renders, and
// you can upgrade items one at a time just by dropping a file in and adding a
// line below.
//
// HOW TO ADD A MODEL
//   1. Get a low-poly .glb (see docs below for free CC0 sources).
//   2. Save it as   src/assets/models/<name>.glb
//   3. Add a line:  car: model(require('../assets/models/car.glb')),
//   4. Reload the app. That's it — the item now renders the real model.
//
// PER-MODEL TUNING (all optional, second arg):
//   { rotY, scale, fit, yOffset }
//   - rotY   : radians to spin the model so its "front" faces +Z (default 0).
//              Common fixes: Math.PI (180°), Math.PI/2, -Math.PI/2.
//   - scale  : extra multiplier after auto-fit, e.g. 0.9 to shrink slightly.
//   - fit    : 'contain' (default) fits fully inside the item box;
//              'cover' fills the footprint (may exceed height).
//   - yOffset: meters to nudge vertically if the model floats/sinks.
//
// WHERE TO GET FREE, APP-SAFE (CC0) MODELS
//   - Kenney            https://kenney.nl/assets            (furniture, cars)
//   - Quaternius        https://quaternius.com              (furniture, nature)
//   - Poly Pizza        https://poly.pizza                  (huge low-poly library)
//   - Sketchfab         filter by license = CC0 / CC-BY, format glTF
//   Prefer models under ~5k triangles with embedded textures; they load fast
//   on phones and match the "stylized-but-realistic" look you're after.
// ---------------------------------------------------------------------------

const model = (src, opts = {}) => ({
  src,
  rotY: opts.rotY || 0,
  scale: opts.scale || 1,
  fit: opts.fit || 'contain',
  yOffset: opts.yOffset || 0,
});

// Register models here, keyed by item `kind`. Empty by default — the app runs
// entirely on procedural fallbacks until you drop files in. Uncomment a line
// once the matching file exists in src/assets/models/.
export const MODELS = {
  // --- vehicles ---
  car: model(require('../assets/models/car.glb'), { rotY: 0 }),

  // --- living / bedroom ---
  // sofa: model(require('../assets/models/sofa.glb')),
  // bed: model(require('../assets/models/bed.glb')),
  // chair: model(require('../assets/models/chair.glb')),
  // table: model(require('../assets/models/table.glb')),
  // tv: model(require('../assets/models/tv.glb')),

  // --- plants / outdoor ---
  // tree: model(require('../assets/models/tree.glb'), { fit: 'cover' }),
  // plant: model(require('../assets/models/plant.glb')),
};

// Returns the model config for a kind, or null to use the procedural fallback.
export function modelFor(kind) {
  return MODELS[kind] || null;
}

export function hasModel(kind) {
  return !!MODELS[kind];
}
