// Item editor schema — the single source of truth the edit sheet and the 3D
// builders (three/models.jsx) share. It declares, per item `kind`:
//   • which sub-parts can be colored independently (PART_SCHEMAS), and
//   • whether the item hangs on a wall + its default height (MOUNT).
//
// Backward-compatible by construction: an item with no `parts` overrides and no
// `elevation` renders exactly as before, because every part falls back to the
// item's existing `color` (or the old derived tint) and elevation defaults to 0.
//
// The `primary` part maps to the item's existing `item.color` (so the 2D glyph
// and legacy renders still update); every other part is stored under
// `item.parts[key]`. Builders read colors via `pc(parts, key, fallback)`.

// Swatch palettes surfaced in the sheet's per-part color row.
const WOODS = ['#8A6250', '#6E5240', '#A87B54', '#5A4636', '#D8D2C4'];
const NEUTRALS = ['#F4F1EA', '#D8D2C4', '#B8BCC2', '#3E4A5C', '#1B1A17'];
const METALS = ['#B8BCC2', '#8B9096', '#C79A45', '#3E4A5C', '#1B1A17'];
const DARKS = ['#1B1A17', '#101418', '#2E2A26', '#3E4A5C'];
const FABRICS = ['#BC5B3A', '#4E7C59', '#8A6250', '#3E4A5C', '#D8D2C4'];
const GLASSES = ['#9FC4DC', '#B7D2E0', '#6E8A99', '#39454F'];

// Canonical part lists keyed by a normalized kind (see `partsFor`).
export const PART_SCHEMAS = {
  door: [
    { key: 'frame', label: 'Frame', primary: true, swatches: WOODS },
    { key: 'leaf', label: 'Sheet', swatches: WOODS },
    { key: 'handle', label: 'Handle', swatches: METALS },
  ],
  window: [
    { key: 'frame', label: 'Frame', primary: true, swatches: NEUTRALS },
    { key: 'glass', label: 'Glass', swatches: GLASSES },
  ],
  tv: [
    { key: 'frame', label: 'Bezel', primary: true, swatches: DARKS },
    { key: 'screen', label: 'Screen', swatches: DARKS },
    { key: 'stand', label: 'Stand', swatches: METALS },
  ],
  ac: [
    { key: 'body', label: 'Body', primary: true, swatches: NEUTRALS },
    { key: 'vent', label: 'Vent', swatches: NEUTRALS },
    { key: 'panel', label: 'Panel', swatches: METALS },
  ],
  mirror: [
    { key: 'frame', label: 'Frame', primary: true, swatches: METALS },
    { key: 'glass', label: 'Glass', swatches: GLASSES },
  ],
  sofa: [
    { key: 'body', label: 'Upholstery', primary: true, swatches: FABRICS },
    { key: 'base', label: 'Base', swatches: FABRICS },
  ],
  bed: [
    { key: 'headboard', label: 'Headboard', primary: true, swatches: FABRICS },
    { key: 'bedding', label: 'Bedding', swatches: NEUTRALS },
    { key: 'base', label: 'Base', swatches: WOODS },
  ],
  cabinet: [
    { key: 'body', label: 'Body', primary: true, swatches: WOODS },
    { key: 'handle', label: 'Handles', swatches: METALS },
  ],
  wallShelf: [
    { key: 'board', label: 'Board', primary: true, swatches: WOODS },
    { key: 'bracket', label: 'Brackets', swatches: METALS },
  ],
};

// Kinds that share a builder also share a part schema.
const KIND_ALIAS = {
  sectional: 'sofa',
  wardrobe: 'cabinet',
  dresser: 'cabinet',
  nightstand: 'cabinet',
};

// Implicit single-color schema for any kind without a curated one.
const DEFAULT_PARTS = [{ key: 'main', label: 'Color', primary: true }];

// Normalize a kind → its part schema. Door/window kinds are families
// (doorSingle, windowFixed, …) collapsed onto the shared 'door'/'window' entry.
export function partsFor(kind) {
  if (!kind) return DEFAULT_PARTS;
  if (kind.startsWith('door')) return PART_SCHEMAS.door;
  if (kind.startsWith('window')) return PART_SCHEMAS.window;
  const canonical = KIND_ALIAS[kind] || kind;
  return PART_SCHEMAS[canonical] || DEFAULT_PARTS;
}

// Read a part color: an explicit override wins, else the builder's fallback
// (which preserves the item's original look until a part is edited).
export const pc = (parts, key, fallback) => (parts && parts[key]) || fallback;

// Wall-mounted items: `type` is informational; `default` is the placement
// elevation in meters (bottom of the item off its floor slab). Only these kinds
// show the Height tab in the editor and get a non-zero default elevation.
export const MOUNT = {
  tv: { type: 'wall', default: 1.0 },
  ac: { type: 'wall', default: 2.0 },
  mirror: { type: 'wall', default: 1.0 },
  wallShelf: { type: 'wall', default: 1.2 },
  // Electrical fixtures that hang high off the floor.
  ceilingFan: { type: 'ceiling', default: 2.3 },
  exhaustFan: { type: 'wall', default: 2.0 },
  sconce: { type: 'wall', default: 1.7 },
};

// Windows carry an adjustable SILL (some are floor-height French/patio units,
// most start partway up the wall). We reuse the `elevation` field as the sill so
// the same Height tab, the 3D frame mesh, and the carved wall opening all read
// one value. Doors always run to the floor (not height-adjustable).
export const WINDOW_SILL_DEFAULT = 0.85;

export function isMountable(kind) {
  if (!kind) return false;
  if (kind.startsWith('window')) return true;
  return !!MOUNT[kind];
}

export function defaultElevation(kind) {
  if (!kind) return 0;
  if (kind.startsWith('window')) return WINDOW_SILL_DEFAULT;
  return MOUNT[kind]?.default ?? 0;
}
