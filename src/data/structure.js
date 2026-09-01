// Structure/opening rendering geometry — shared by the 2D editor and the 3D
// builders for every structure item (room shells, stairs, walls, doors,
// windows), regardless of whether that item's catalog record came from the
// backend or (on old cached data) the retired bundled seed. The catalog
// records themselves are backend-driven now — see useCatalogStore.
//
// Each structure item mirrors a CATALOG item (id, name, category, kind,
// dimensions in cm, colors, cost, tags) plus two structure-only fields
// consumed by the renderer:
//   structure: true         — draw as a shell piece, not a furniture glyph box
//   shape: { type, ... }     — how to draw it inside the item's w×d footprint
//
// `shape.type`:
//   'polygon' — points are normalized [0..1] coords in the footprint box; the 2D
//               editor fills a grey floor and strokes the outline as walls.
//   'stairs'  — `steps` tread lines across the run; `turn` = 'straight'|'l'|'spiral'
//   'column'  — `round` true/false, filled pier
//   'wall'    — a single thick wall stroke down the footprint's long axis
//   'ramp'    — sloped slab with direction arrows
//   'door'    — leaf + swing arc; `leaves` = 1|2, `slide` true for sliding
//   'window'  — pane; `bay` true for a projecting bay

// Grey shell palette (2D fills / 3D tint). First entry is the default color.
export const SHELL = ['#B9B2A6', '#9A9284', '#7C6A55', '#4A4034'];
const SHELL_LIGHT = ['#CFC8BB', '#B9B2A6', '#9A9284'];

// Normalized footprint polygons (0,0 = top-left corner, 1,1 = bottom-right).
export const SHAPE_POLYGONS = {
  roomSquare: [[0, 0], [1, 0], [1, 1], [0, 1]],
  roomL: [[0, 0], [0.62, 0], [0.62, 0.5], [1, 0.5], [1, 1], [0, 1]],
  roomU: [[0, 0], [0.32, 0], [0.32, 0.68], [0.68, 0.68], [0.68, 0], [1, 0], [1, 1], [0, 1]],
  roomT: [[0, 0], [1, 0], [1, 0.42], [0.66, 0.42], [0.66, 1], [0.34, 1], [0.34, 0.42], [0, 0.42]],
  landing: [[0, 0], [1, 0], [1, 1], [0, 1]],
};

// Return normalized outline points for a polygon-type structure, or null.
export function shapePolygon(kind) {
  return SHAPE_POLYGONS[kind] || null;
}

// Editable vertex list for a polygon structure, in LOCAL METERS centered on the
// item's origin (0,0 = center). Derived from the kind's normalized outline scaled
// to a w×d footprint. Placed items store this on `shape.points` so each corner can
// be dragged independently; the renderer / 3D builder read it back verbatim.
export function polygonLocalPoints(kind, w, d) {
  const poly = shapePolygon(kind);
  if (!poly) return null;
  return poly.map(([nx, ny]) => ({
    x: Math.round((nx - 0.5) * w * 1000) / 1000,
    y: Math.round((ny - 0.5) * d * 1000) / 1000,
  }));
}
