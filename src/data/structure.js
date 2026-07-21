// Structure & opening catalog — the grey "shell" pieces a plan is built from:
// room shapes (square / L / U / T), circulation (stairs, landing, ramp),
// elements (column, wall segment, arch) and door / window presets.
//
// Each entry mirrors a CATALOG item (id, name, category, kind, dimensions in cm,
// colors, cost, tags) plus two structure-only fields consumed by the renderer:
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

export const STRUCTURE_ITEMS = [
  // ---- Room shapes (h = full wall height so 3D extrudes floor + 4 walls) --
  { id: 'space-square', name: 'Square Room', category: 'Structure', kind: 'roomSquare', dimensions: { w: 400, d: 400, h: 260 }, colors: SHELL, cost: 0, structure: true, shape: { type: 'polygon', kind: 'roomSquare' }, tags: ['room', 'space', 'rectangle', 'shell'] },
  { id: 'space-l', name: 'L-Shape Room', category: 'Structure', kind: 'roomL', dimensions: { w: 500, d: 480, h: 260 }, colors: SHELL, cost: 0, structure: true, shape: { type: 'polygon', kind: 'roomL' }, tags: ['room', 'space', 'l-shape', 'corner', 'shell'] },
  { id: 'space-u', name: 'U-Shape Room', category: 'Structure', kind: 'roomU', dimensions: { w: 560, d: 460, h: 260 }, colors: SHELL, cost: 0, structure: true, shape: { type: 'polygon', kind: 'roomU' }, tags: ['room', 'space', 'u-shape', 'shell'] },
  { id: 'space-t', name: 'T-Shape Room', category: 'Structure', kind: 'roomT', dimensions: { w: 560, d: 480, h: 260 }, colors: SHELL, cost: 0, structure: true, shape: { type: 'polygon', kind: 'roomT' }, tags: ['room', 'space', 't-shape', 'shell'] },

  // ---- Circulation ------------------------------------------------------
  { id: 'stairs-straight', name: 'Straight Stairs', category: 'Structure', kind: 'stairsStraight', dimensions: { w: 100, d: 300, h: 20 }, colors: SHELL_LIGHT, cost: 0, structure: true, shape: { type: 'stairs', turn: 'straight', steps: 12 }, tags: ['stairs', 'steps', 'flight', 'circulation'] },
  { id: 'stairs-l', name: 'L-Turn Stairs', category: 'Structure', kind: 'stairsL', dimensions: { w: 250, d: 250, h: 20 }, colors: SHELL_LIGHT, cost: 1, structure: true, shape: { type: 'stairs', turn: 'l', steps: 12 }, tags: ['stairs', 'quarter-turn', 'steps'] },
  { id: 'stairs-spiral', name: 'Spiral Stairs', category: 'Structure', kind: 'stairsSpiral', dimensions: { w: 200, d: 200, h: 20 }, colors: SHELL_LIGHT, cost: 2, structure: true, shape: { type: 'stairs', turn: 'spiral', steps: 12 }, tags: ['stairs', 'spiral', 'circular', 'steps'] },
  { id: 'landing', name: 'Landing', category: 'Structure', kind: 'landing', dimensions: { w: 150, d: 150, h: 8 }, colors: SHELL_LIGHT, cost: 0, structure: true, shape: { type: 'polygon', kind: 'landing' }, tags: ['landing', 'platform', 'deck'] },
  { id: 'ramp', name: 'Ramp', category: 'Structure', kind: 'ramp', dimensions: { w: 120, d: 400, h: 12 }, colors: SHELL_LIGHT, cost: 1, structure: true, shape: { type: 'ramp' }, tags: ['ramp', 'slope', 'accessible', 'incline'] },

  // ---- Elements ---------------------------------------------------------
  { id: 'wall-segment', name: 'Wall Segment', category: 'Structure', kind: 'wallSegment', dimensions: { w: 300, d: 12, h: 260 }, colors: SHELL, cost: 0, structure: true, shape: { type: 'wall' }, tags: ['wall', 'partition', 'divider'] },
  { id: 'column-square', name: 'Square Column', category: 'Structure', kind: 'column', dimensions: { w: 40, d: 40, h: 260 }, colors: SHELL, cost: 0, structure: true, shape: { type: 'column', round: false }, tags: ['column', 'pillar', 'post'] },
  { id: 'column-round', name: 'Round Column', category: 'Structure', kind: 'column', dimensions: { w: 45, d: 45, h: 260 }, colors: SHELL, cost: 0, structure: true, shape: { type: 'column', round: true }, tags: ['column', 'pillar', 'round', 'circular'] },
  { id: 'arch', name: 'Arch Opening', category: 'Structure', kind: 'archOpening', dimensions: { w: 140, d: 20, h: 210 }, colors: SHELL, cost: 1, structure: true, shape: { type: 'arch' }, tags: ['arch', 'opening', 'archway'] },

  // ---- Doors & Windows --------------------------------------------------
  { id: 'door-single', name: 'Single Door', category: 'Doors & Windows', kind: 'doorSingle', dimensions: { w: 90, d: 12, h: 205 }, colors: SHELL, cost: 0, structure: true, shape: { type: 'door', leaves: 1 }, tags: ['door', 'interior', 'single'] },
  { id: 'door-double', name: 'Double Door', category: 'Doors & Windows', kind: 'doorDouble', dimensions: { w: 160, d: 12, h: 210 }, colors: SHELL, cost: 1, structure: true, shape: { type: 'door', leaves: 2 }, tags: ['door', 'double', 'french'] },
  { id: 'door-main', name: 'Main Front Gate', category: 'Doors & Windows', kind: 'doorMainGate', dimensions: { w: 300, d: 20, h: 220 }, colors: SHELL, cost: 2, structure: true, shape: { type: 'door', leaves: 2, gate: true }, tags: ['door', 'gate', 'entrance', 'front', 'main'] },
  { id: 'door-sliding', name: 'Sliding Door', category: 'Doors & Windows', kind: 'doorSliding', dimensions: { w: 180, d: 12, h: 210 }, colors: SHELL, cost: 1, structure: true, shape: { type: 'door', leaves: 2, slide: true }, tags: ['door', 'sliding', 'patio', 'glass'] },
  { id: 'window-fixed', name: 'Fixed Window', category: 'Doors & Windows', kind: 'windowFixed', dimensions: { w: 120, d: 12, h: 120 }, colors: SHELL, cost: 0, structure: true, shape: { type: 'window' }, tags: ['window', 'fixed', 'pane'] },
  { id: 'window-sliding', name: 'Sliding Window', category: 'Doors & Windows', kind: 'windowSliding', dimensions: { w: 150, d: 12, h: 120 }, colors: SHELL, cost: 1, structure: true, shape: { type: 'window', slide: true }, tags: ['window', 'sliding'] },
  { id: 'window-bay', name: 'Bay Window', category: 'Doors & Windows', kind: 'windowBay', dimensions: { w: 200, d: 60, h: 140 }, colors: SHELL, cost: 2, structure: true, shape: { type: 'window', bay: true }, tags: ['window', 'bay', 'projecting'] },
];
