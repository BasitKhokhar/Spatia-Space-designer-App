// ---------------------------------------------------------------------------
// Real 3D model registry.
//
// Maps an item's `catalogId` (preferred) or `kind` (fallback) to a bundled
// `.glb`. When neither resolves, the 3D view falls back to the procedural
// box/cylinder builder in models.jsx — so the app always renders and coverage
// can grow one item at a time.
//
// THE MODELS
// Everything below is from the Kenney Furniture Kit 2.0 (CC0 — free for
// commercial use, attribution optional; License.txt ships alongside the files).
// Import them with `node scripts/models/import-kenney.mjs`.
//
// The kit is authored UNLIT and UNTEXTURED. Rendering it as-authored looks worse
// than the procedural fallback, so every model goes through prepareModel(),
// which swaps in the app's PBR materials based on the GLB's own material names.
// See materials/kenneyMap.js. Do not bypass that path.
//
// ORIENTATION
// Kenney models face +Z with their tall mass (backrest, headboard) toward -Z —
// the same convention the procedural builders use — so `rotY` stays 0 kit-wide.
// Verified by measuring the top-35%-of-vertices centroid on every seat model.
//
// WHY MODELS ARE NAMED, NOT REQUIRED INLINE
// The 2D catalog tile (components/graphics/itemThumbs.js) has to show the SAME
// product the 3D view will draw. Both registries therefore resolve to a Kenney
// base name via modelNameFor(), and each maps that one name to its own asset.
// A mapping change here cannot silently desync the tiles.
//
// BUNDLE SIZE
// Metro only bundles what is require()'d, so the 67 models named in GLB are what
// ships (~1.0MB), not the full 140-file folder.
//
// PER-MODEL TUNING (all optional, second arg):
//   { rotY, scale, fit, yOffset }
//   - rotY   : radians to spin the model so its "front" faces +Z (default 0).
//   - scale  : extra multiplier after auto-fit, e.g. 0.9 to shrink slightly.
//   - fit    : 'contain' (default) fits fully inside the item box;
//              'cover' fills the footprint (may exceed height).
//   - yOffset: meters to nudge vertically if the model floats/sinks.
//
// OTHER CC0 SOURCES, if you outgrow the kit:
//   Kenney https://kenney.nl/assets · Quaternius https://quaternius.com
//   Poly Pizza https://poly.pizza · Sketchfab (filter license = CC0, glTF)
// ---------------------------------------------------------------------------

// Kenney base name -> bundled asset. The single list of models that ship.
const GLB = {
  bathroomCabinet: require('../assets/models/kenney/bathroomCabinet.glb'),
  bathroomCabinetDrawer: require('../assets/models/kenney/bathroomCabinetDrawer.glb'),
  bathroomMirror: require('../assets/models/kenney/bathroomMirror.glb'),
  bathroomSink: require('../assets/models/kenney/bathroomSink.glb'),
  bathtub: require('../assets/models/kenney/bathtub.glb'),
  bedBunk: require('../assets/models/kenney/bedBunk.glb'),
  bedDouble: require('../assets/models/kenney/bedDouble.glb'),
  bedSingle: require('../assets/models/kenney/bedSingle.glb'),
  bench: require('../assets/models/kenney/bench.glb'),
  bookcaseClosedDoors: require('../assets/models/kenney/bookcaseClosedDoors.glb'),
  bookcaseClosedWide: require('../assets/models/kenney/bookcaseClosedWide.glb'),
  bookcaseOpen: require('../assets/models/kenney/bookcaseOpen.glb'),
  bookcaseOpenLow: require('../assets/models/kenney/bookcaseOpenLow.glb'),
  cabinetBedDrawer: require('../assets/models/kenney/cabinetBedDrawer.glb'),
  cabinetTelevision: require('../assets/models/kenney/cabinetTelevision.glb'),
  cabinetTelevisionDoors: require('../assets/models/kenney/cabinetTelevisionDoors.glb'),
  cardboardBoxClosed: require('../assets/models/kenney/cardboardBoxClosed.glb'),
  ceilingFan: require('../assets/models/kenney/ceilingFan.glb'),
  chair: require('../assets/models/kenney/chair.glb'),
  chairCushion: require('../assets/models/kenney/chairCushion.glb'),
  chairDesk: require('../assets/models/kenney/chairDesk.glb'),
  chairModernCushion: require('../assets/models/kenney/chairModernCushion.glb'),
  chairRounded: require('../assets/models/kenney/chairRounded.glb'),
  desk: require('../assets/models/kenney/desk.glb'),
  deskCorner: require('../assets/models/kenney/deskCorner.glb'),
  kitchenBar: require('../assets/models/kenney/kitchenBar.glb'),
  kitchenCabinet: require('../assets/models/kenney/kitchenCabinet.glb'),
  kitchenCabinetUpper: require('../assets/models/kenney/kitchenCabinetUpper.glb'),
  kitchenFridge: require('../assets/models/kenney/kitchenFridge.glb'),
  kitchenFridgeLarge: require('../assets/models/kenney/kitchenFridgeLarge.glb'),
  kitchenFridgeSmall: require('../assets/models/kenney/kitchenFridgeSmall.glb'),
  kitchenSink: require('../assets/models/kenney/kitchenSink.glb'),
  kitchenStove: require('../assets/models/kenney/kitchenStove.glb'),
  kitchenStoveElectric: require('../assets/models/kenney/kitchenStoveElectric.glb'),
  lampRoundFloor: require('../assets/models/kenney/lampRoundFloor.glb'),
  lampRoundTable: require('../assets/models/kenney/lampRoundTable.glb'),
  lampSquareCeiling: require('../assets/models/kenney/lampSquareCeiling.glb'),
  lampSquareFloor: require('../assets/models/kenney/lampSquareFloor.glb'),
  lampWall: require('../assets/models/kenney/lampWall.glb'),
  loungeChair: require('../assets/models/kenney/loungeChair.glb'),
  loungeChairRelax: require('../assets/models/kenney/loungeChairRelax.glb'),
  loungeDesignSofa: require('../assets/models/kenney/loungeDesignSofa.glb'),
  loungeDesignSofaCorner: require('../assets/models/kenney/loungeDesignSofaCorner.glb'),
  loungeSofa: require('../assets/models/kenney/loungeSofa.glb'),
  loungeSofaCorner: require('../assets/models/kenney/loungeSofaCorner.glb'),
  loungeSofaLong: require('../assets/models/kenney/loungeSofaLong.glb'),
  loungeSofaOttoman: require('../assets/models/kenney/loungeSofaOttoman.glb'),
  plantSmall1: require('../assets/models/kenney/plantSmall1.glb'),
  plantSmall2: require('../assets/models/kenney/plantSmall2.glb'),
  plantSmall3: require('../assets/models/kenney/plantSmall3.glb'),
  pottedPlant: require('../assets/models/kenney/pottedPlant.glb'),
  rugRectangle: require('../assets/models/kenney/rugRectangle.glb'),
  shower: require('../assets/models/kenney/shower.glb'),
  showerRound: require('../assets/models/kenney/showerRound.glb'),
  sideTable: require('../assets/models/kenney/sideTable.glb'),
  sideTableDrawers: require('../assets/models/kenney/sideTableDrawers.glb'),
  stoolBar: require('../assets/models/kenney/stoolBar.glb'),
  table: require('../assets/models/kenney/table.glb'),
  tableCloth: require('../assets/models/kenney/tableCloth.glb'),
  tableCoffee: require('../assets/models/kenney/tableCoffee.glb'),
  tableCoffeeGlass: require('../assets/models/kenney/tableCoffeeGlass.glb'),
  tableGlass: require('../assets/models/kenney/tableGlass.glb'),
  tableRound: require('../assets/models/kenney/tableRound.glb'),
  televisionModern: require('../assets/models/kenney/televisionModern.glb'),
  toilet: require('../assets/models/kenney/toilet.glb'),
  trashcan: require('../assets/models/kenney/trashcan.glb'),
  washer: require('../assets/models/kenney/washer.glb'),
};

const model = (name, opts = {}) => ({
  name,
  src: GLB[name],
  rotY: opts.rotY || 0,
  scale: opts.scale || 1,
  fit: opts.fit || 'contain',
  yOffset: opts.yOffset || 0,
});

// Sentinel: "this catalog item must NOT use its kind's model". Used where the
// generic model for a kind would actively misrepresent the product — a pallet
// stack is not a trash can, a whiteboard is not a television, a fire pit is not
// a round dining table. These fall through to their purpose-built procedural
// builder, which is the more accurate drawing.
const NONE = null;

// ---------------------------------------------------------------------------
// By kind — the baseline every item inherits
// ---------------------------------------------------------------------------
export const MODELS = {
  // --- seating ---
  sofa: model('loungeSofa'),
  sectional: model('loungeSofaCorner'),
  chair: model('chairModernCushion'),
  stool: model('stoolBar'),
  bench: model('bench'),

  // --- tables & desks ---
  table: model('table'),
  roundTable: model('tableRound'),
  desk: model('desk'),
  nightstand: model('sideTableDrawers'),

  // --- bedroom ---
  bed: model('bedDouble'),
  wardrobe: model('bookcaseClosedDoors'),
  dresser: model('cabinetBedDrawer'),

  // --- storage ---
  bookshelf: model('bookcaseOpen'),
  shelfUnit: model('bookcaseOpenLow'),
  cabinet: model('kitchenCabinet'),
  tvStand: model('cabinetTelevision'),
  wallShelf: model('kitchenCabinetUpper'),

  // --- kitchen ---
  counter: model('kitchenCabinet'),
  island: model('kitchenBar'),
  stove: model('kitchenStove'),
  fridge: model('kitchenFridge'),
  sink: model('kitchenSink'),

  // --- bathroom ---
  bathtub: model('bathtub'),
  shower: model('shower'),
  toilet: model('toilet'),
  mirror: model('bathroomMirror'),

  // --- lighting ---
  lamp: model('lampRoundFloor'),
  pendant: model('lampSquareCeiling'),
  sconce: model('lampWall'),
  ceilingFan: model('ceilingFan'),

  // --- decor ---
  tv: model('televisionModern'),
  plant: model('pottedPlant'),
  planter: model('plantSmall1'),
  rug: model('rugRectangle'),

  // --- misc / retail ---
  crate: model('cardboardBoxClosed'),
  bin: model('trashcan'),
  displayCase: model('tableGlass'),

  // No Kenney equivalent — these keep their purpose-built procedural builders:
  // car, tree, lawn, ac, pedestalFan, exhaustFan, sign, mannequin, gondola,
  // rack, roundRack, freezer, fittingRoom, coolerUpright, checkout, basket,
  // displayTable, and every `structure` kind (rooms, walls, stairs, doors,
  // windows) — the kit's architecture pieces are fixed-size tiles and cannot
  // follow the app's parametric walls.
};

// ---------------------------------------------------------------------------
// By catalogId — product-level overrides
// ---------------------------------------------------------------------------
// This is where the variety comes from: `kind: 'chair'` covers eight very
// different products, and one generic chair for all of them is what makes a
// design app feel cheap. Only listed where the override is genuinely better
// than the kind default, or where the default is wrong enough to opt out.
export const MODELS_BY_ID = {
  // --- sofas ---
  'velvet-chesterfield': model('loungeDesignSofa'),
  'cloud-modular': model('loungeDesignSofaCorner'),
  'chaise-lounge': model('loungeChairRelax'),
  'outdoor-lounge': model('loungeSofaLong'),
  ottoman: model('loungeSofaOttoman'),

  // --- chairs ---
  'accent-chair': model('loungeChair'),
  'dining-chair': model('chair'),
  'office-chair': model('chairDesk'),
  'ergo-throne': model('chairDesk'),
  'egg-lounge': model('chairRounded'),
  'massage-recliner': model('loungeChairRelax'),
  'waiting-chair': model('chairCushion'),
  // A dental chair is a rig, not a seat — the procedural build reads better.
  'dental-chair': NONE,

  // --- tables ---
  'oak-coffee-table': model('tableCoffee'),
  'glass-coffee': model('tableCoffeeGlass'),
  'marble-dining': model('tableCloth'),
  'console-table': model('sideTable'),
  'side-table': model('sideTable'),
  'fire-pit': NONE,
  fountain: NONE,

  // --- beds ---
  'single-bed': model('bedSingle'),
  'bunk-bed': model('bedBunk'),

  // --- storage ---
  sideboard: model('cabinetTelevisionDoors'),
  'shoe-cabinet': model('bathroomCabinetDrawer'),
  'medicine-cabinet': model('bathroomCabinet'),
  'filing-cabinet': model('cabinetBedDrawer'),
  'library-shelf': model('bookcaseClosedWide'),

  // --- desks ---
  'l-desk': model('deskCorner'),
  'reception-desk': model('kitchenBar'),
  'cash-wrap': model('kitchenBar'),

  // --- kitchen / appliances ---
  'chef-range': model('kitchenStoveElectric'),
  refrigerator: model('kitchenFridgeLarge'),
  'wine-cooler': model('kitchenFridgeSmall'),
  dishwasher: model('washer'),

  // --- bath ---
  'vanity-basin': model('bathroomSink'),
  'rain-shower': model('showerRound'),

  // --- lighting ---
  'table-lamp': model('lampRoundTable'),
  'designer-arc-lamp': model('lampSquareFloor'),

  // --- decor / garden ---
  'floor-plant': model('plantSmall2'),
  hedge: model('plantSmall3'),
  parasol: NONE,
  pergola: NONE,
  'garden-path': NONE,

  // --- opt-outs: the kind default would misrepresent the product ---
  whiteboard: NONE, // kind 'tv'
  pallet: NONE, // kind 'bin'
  'produce-bin': NONE,
  'shopping-cart-bay': NONE,
  'cargo-container': NONE, // kind 'crate'
  'exam-table': NONE, // kind 'bench'
  'salon-station': NONE, // kind 'displayCase'
};

/**
 * Model config for a placed item, or null to use the procedural fallback.
 * `catalogId` wins over `kind`, and an explicit NONE for a catalogId suppresses
 * the kind default rather than falling through to it.
 */
export function modelFor(kind, catalogId) {
  if (catalogId && Object.prototype.hasOwnProperty.call(MODELS_BY_ID, catalogId)) {
    return MODELS_BY_ID[catalogId];
  }
  return MODELS[kind] || null;
}

/**
 * The Kenney base name a placed item resolves to, or null. This is the join key
 * the 2D thumbnail registry uses so a catalog tile always shows the same product
 * the 3D view will draw.
 */
export function modelNameFor(kind, catalogId) {
  return modelFor(kind, catalogId)?.name || null;
}

export function hasModel(kind, catalogId) {
  return !!modelFor(kind, catalogId);
}

// ---------------------------------------------------------------------------
// Remote (catalog-downloaded) models
// ---------------------------------------------------------------------------
// Produced by scripts/models/pipeline/ (Poly Haven/Quaternius, real PBR
// materials) and served from the backend at item.modelUrl. Same shape as a
// bundled model() entry so ModelItem can treat both uniformly, plus
// `remote: true` so it knows to fetch via src/three/remoteModels.js instead
// of require()'d bundle assets.

// Entries are cached by id so the same catalog item always yields the SAME
// object. ModelItem keys its fitting/cloning useMemo on the entry, so returning
// a fresh literal here would re-clone the whole model scene graph on every
// render and hand <primitive> a new object each time, forcing r3f to tear the
// subtree down and rebuild it. Bundled entries are module-level constants and
// already have this property.
const REMOTE_ENTRIES = new Map(); // catalog id -> frozen entry

function remoteModel(item) {
  if (!item?.modelUrl) return null;

  const hit = REMOTE_ENTRIES.get(item.id);
  if (hit && hit.url === item.modelUrl) return hit;

  const entry = Object.freeze({
    name: item.id,
    remote: true,
    url: item.modelUrl,
    rotY: 0,
    scale: 1,
    fit: 'contain',
    yOffset: 0,
  });
  REMOTE_ENTRIES.set(item.id, entry);
  return entry;
}

/**
 * Full resolution order for a placed item, including remote catalog models:
 *   1. MODELS_BY_ID[catalogId] — explicit override, including NONE (opt-out,
 *      does not fall through).
 *   2. catalogItem.modelUrl — a server-catalog item with a published .glb.
 *   3. MODELS[kind] — the bundled default for the item's kind.
 *   4. null — procedural fallback.
 *
 * @param {string} kind
 * @param {string} catalogId
 * @param {object} [catalogItem] the full catalog row (for its modelUrl), if available
 */
export function resolveModel(kind, catalogId, catalogItem) {
  if (catalogId && Object.prototype.hasOwnProperty.call(MODELS_BY_ID, catalogId)) {
    return MODELS_BY_ID[catalogId];
  }
  const remote = remoteModel(catalogItem);
  if (remote) return remote;
  return MODELS[kind] || null;
}
