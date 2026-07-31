// ---------------------------------------------------------------------------
// 2D item thumbnail registry.
//
// Shows a real product image in the catalog/browse tiles instead of the flat
// vector glyph. When an item resolves to no image, the app falls back to the SVG
// glyph in FurnitureGlyph.jsx — so nothing breaks and coverage can grow.
//
// KEYED THROUGH THE 3D REGISTRY, NOT DUPLICATED
// The tile has to show the same product the 3D view will draw, so both go
// through modelNameFor(kind, catalogId) in three/modelRegistry.js. Change a
// mapping there and the tile follows automatically; there is no second mapping
// to keep in sync. The map below is only "Kenney base name -> its PNG".
//
// THE IMAGES
// Kenney Furniture Kit isometric (_NE) previews, imported by
// `node scripts/models/import-kenney.mjs`. CC0. ~195KB for the 67 models the
// app actually bundles.
//
// TRADE-OFF WORTH KNOWING
// These are flat-shaded renders in Kenney's own palette, so unlike the vector
// glyphs they do NOT tint to the item's selected colour — a tile shows the
// product's shape, not the swatch the user picked. Shape recognition is the
// bigger win in a browse grid, but if the flat-colour look clashes with the
// app's palette, set ENABLED to false below and everything reverts to the vector
// glyphs in one line. The proper fix is rendering these from the app's own PBR
// models offline (scripts/thumbs), which would match exactly.
// ---------------------------------------------------------------------------

import { modelNameFor } from '@/three/modelRegistry';

// Master switch — see the trade-off note above.
const ENABLED = true;

// Kenney base name -> bundled PNG. Keys must match GLB in three/modelRegistry.js.
const THUMB_FILES = {
  bathroomCabinet: require('../../assets/thumbs/kenney/bathroomCabinet.png'),
  bathroomCabinetDrawer: require('../../assets/thumbs/kenney/bathroomCabinetDrawer.png'),
  bathroomMirror: require('../../assets/thumbs/kenney/bathroomMirror.png'),
  bathroomSink: require('../../assets/thumbs/kenney/bathroomSink.png'),
  bathtub: require('../../assets/thumbs/kenney/bathtub.png'),
  bedBunk: require('../../assets/thumbs/kenney/bedBunk.png'),
  bedDouble: require('../../assets/thumbs/kenney/bedDouble.png'),
  bedSingle: require('../../assets/thumbs/kenney/bedSingle.png'),
  bench: require('../../assets/thumbs/kenney/bench.png'),
  bookcaseClosedDoors: require('../../assets/thumbs/kenney/bookcaseClosedDoors.png'),
  bookcaseClosedWide: require('../../assets/thumbs/kenney/bookcaseClosedWide.png'),
  bookcaseOpen: require('../../assets/thumbs/kenney/bookcaseOpen.png'),
  bookcaseOpenLow: require('../../assets/thumbs/kenney/bookcaseOpenLow.png'),
  cabinetBedDrawer: require('../../assets/thumbs/kenney/cabinetBedDrawer.png'),
  cabinetTelevision: require('../../assets/thumbs/kenney/cabinetTelevision.png'),
  cabinetTelevisionDoors: require('../../assets/thumbs/kenney/cabinetTelevisionDoors.png'),
  cardboardBoxClosed: require('../../assets/thumbs/kenney/cardboardBoxClosed.png'),
  ceilingFan: require('../../assets/thumbs/kenney/ceilingFan.png'),
  chair: require('../../assets/thumbs/kenney/chair.png'),
  chairCushion: require('../../assets/thumbs/kenney/chairCushion.png'),
  chairDesk: require('../../assets/thumbs/kenney/chairDesk.png'),
  chairModernCushion: require('../../assets/thumbs/kenney/chairModernCushion.png'),
  chairRounded: require('../../assets/thumbs/kenney/chairRounded.png'),
  desk: require('../../assets/thumbs/kenney/desk.png'),
  deskCorner: require('../../assets/thumbs/kenney/deskCorner.png'),
  kitchenBar: require('../../assets/thumbs/kenney/kitchenBar.png'),
  kitchenCabinet: require('../../assets/thumbs/kenney/kitchenCabinet.png'),
  kitchenCabinetUpper: require('../../assets/thumbs/kenney/kitchenCabinetUpper.png'),
  kitchenFridge: require('../../assets/thumbs/kenney/kitchenFridge.png'),
  kitchenFridgeLarge: require('../../assets/thumbs/kenney/kitchenFridgeLarge.png'),
  kitchenFridgeSmall: require('../../assets/thumbs/kenney/kitchenFridgeSmall.png'),
  kitchenSink: require('../../assets/thumbs/kenney/kitchenSink.png'),
  kitchenStove: require('../../assets/thumbs/kenney/kitchenStove.png'),
  kitchenStoveElectric: require('../../assets/thumbs/kenney/kitchenStoveElectric.png'),
  lampRoundFloor: require('../../assets/thumbs/kenney/lampRoundFloor.png'),
  lampRoundTable: require('../../assets/thumbs/kenney/lampRoundTable.png'),
  lampSquareCeiling: require('../../assets/thumbs/kenney/lampSquareCeiling.png'),
  lampSquareFloor: require('../../assets/thumbs/kenney/lampSquareFloor.png'),
  lampWall: require('../../assets/thumbs/kenney/lampWall.png'),
  loungeChair: require('../../assets/thumbs/kenney/loungeChair.png'),
  loungeChairRelax: require('../../assets/thumbs/kenney/loungeChairRelax.png'),
  loungeDesignSofa: require('../../assets/thumbs/kenney/loungeDesignSofa.png'),
  loungeDesignSofaCorner: require('../../assets/thumbs/kenney/loungeDesignSofaCorner.png'),
  loungeSofa: require('../../assets/thumbs/kenney/loungeSofa.png'),
  loungeSofaCorner: require('../../assets/thumbs/kenney/loungeSofaCorner.png'),
  loungeSofaLong: require('../../assets/thumbs/kenney/loungeSofaLong.png'),
  loungeSofaOttoman: require('../../assets/thumbs/kenney/loungeSofaOttoman.png'),
  plantSmall1: require('../../assets/thumbs/kenney/plantSmall1.png'),
  plantSmall2: require('../../assets/thumbs/kenney/plantSmall2.png'),
  plantSmall3: require('../../assets/thumbs/kenney/plantSmall3.png'),
  pottedPlant: require('../../assets/thumbs/kenney/pottedPlant.png'),
  rugRectangle: require('../../assets/thumbs/kenney/rugRectangle.png'),
  shower: require('../../assets/thumbs/kenney/shower.png'),
  showerRound: require('../../assets/thumbs/kenney/showerRound.png'),
  sideTable: require('../../assets/thumbs/kenney/sideTable.png'),
  sideTableDrawers: require('../../assets/thumbs/kenney/sideTableDrawers.png'),
  stoolBar: require('../../assets/thumbs/kenney/stoolBar.png'),
  table: require('../../assets/thumbs/kenney/table.png'),
  tableCloth: require('../../assets/thumbs/kenney/tableCloth.png'),
  tableCoffee: require('../../assets/thumbs/kenney/tableCoffee.png'),
  tableCoffeeGlass: require('../../assets/thumbs/kenney/tableCoffeeGlass.png'),
  tableGlass: require('../../assets/thumbs/kenney/tableGlass.png'),
  tableRound: require('../../assets/thumbs/kenney/tableRound.png'),
  televisionModern: require('../../assets/thumbs/kenney/televisionModern.png'),
  toilet: require('../../assets/thumbs/kenney/toilet.png'),
  trashcan: require('../../assets/thumbs/kenney/trashcan.png'),
  washer: require('../../assets/thumbs/kenney/washer.png'),
};

/**
 * PNG source for a catalog item, or null to use the vector glyph fallback.
 *
 * @param {string} kind item render kind
 * @param {string} [catalogId] product id — wins over `kind`, exactly as it does
 *        for the 3D model, so a tile and its 3D placement never disagree
 */
export function thumbFor(kind, catalogId) {
  if (!ENABLED) return null;
  const name = modelNameFor(kind, catalogId);
  return (name && THUMB_FILES[name]) || null;
}

/** Diagnostics: how many models ship an image. */
export function thumbCount() {
  return Object.keys(THUMB_FILES).length;
}
