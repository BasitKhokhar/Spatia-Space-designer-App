import { uid } from '@/utils/id';
import { areaM2 } from './units';
import { defaultElevation } from '@/data/itemEditor';
import { polygonLocalPoints, shapePolygon, SHELL } from '@/data/structure';

// ---------------------------------------------------------------------------
// The floor-plan model is the single source of truth shared by the 2D editor,
// the 3D view, and the OBJ exporter. All coordinates are in METERS, with the
// room's top-left corner at (0,0) and +x right, +y "down" in plan space.
//
// walls:    line segments { id, x1,y1,x2,y2, thickness, perimeter? }
// openings: doors/windows cut into a wall
//           { id, wallId, kind:'door'|'window', t (0..1 along wall), width,
//             height, sill }
// materials: { floor: <floorId>, wall: <hex> }
// ---------------------------------------------------------------------------

export const DEFAULT_WALL_THICKNESS = 0.12; // 12 cm
export const GRID_STEP = 0.1; // snap resolution in meters

export const OPENING_DEFAULTS = {
  door: { width: 0.9, height: 2.05, sill: 0 },
  window: { width: 1.2, height: 1.2, sill: 0.9 },
};

// Stable ids for perimeter walls so openings survive a room resize.
const PERIMETER_IDS = ['wall-top', 'wall-right', 'wall-bottom', 'wall-left'];

// Build the four perimeter walls for a rectangular room.
export function rectWalls(width, length, thickness = DEFAULT_WALL_THICKNESS) {
  return [
    { id: PERIMETER_IDS[0], x1: 0, y1: 0, x2: width, y2: 0, thickness, perimeter: true },
    { id: PERIMETER_IDS[1], x1: width, y1: 0, x2: width, y2: length, thickness, perimeter: true },
    { id: PERIMETER_IDS[2], x1: width, y1: length, x2: 0, y2: length, thickness, perimeter: true },
    { id: PERIMETER_IDS[3], x1: 0, y1: length, x2: 0, y2: 0, thickness, perimeter: true },
  ];
}

// Perimeter walls for an arbitrary polygon footprint (one wall per edge, wrapping
// back to the start). Ids are stable by index; each is flagged `perimeter` so the
// 3D cutaway culling and resize logic treat it like an outer wall.
export function polygonWalls(points, thickness = DEFAULT_WALL_THICKNESS) {
  const n = points.length;
  return points.map((p, i) => {
    const q = points[(i + 1) % n];
    return { id: `perim-${i}`, x1: p.x, y1: p.y, x2: q.x, y2: q.y, thickness, perimeter: true };
  });
}

// Shift a polygon so its top-left corner sits at (0,0) and report the bounding
// box. Coordinates are rounded to the mm to keep the model tidy.
function normalizePolygon(points) {
  const minX = Math.min(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const shifted = points.map((p) => ({ x: Math.round((p.x - minX) * 1000) / 1000, y: Math.round((p.y - minY) * 1000) / 1000 }));
  return {
    points: shifted,
    minX,
    minY,
    width: Math.max(...shifted.map((p) => p.x)),
    length: Math.max(...shifted.map((p) => p.y)),
  };
}

// Create a fresh floor plan. Pass `footprint` (ordered polygon of {x,y} in
// meters) for a non-rectangular room; otherwise a rectangle of width×length.
export function createFloorPlan({ width = 4.2, length = 3.6, footprint = null, perimeter = true } = {}) {
  const fp = footprint && footprint.length >= 3 ? normalizePolygon(footprint) : null;
  const w = fp ? fp.width : width;
  const l = fp ? fp.length : length;
  // A polygon footprint always draws its outline. Otherwise `perimeter` decides:
  // true → a rectangle of the given size; false → a blank canvas the user draws
  // everything on (no auto-added room / square).
  return {
    width: w,
    length: l,
    wallHeight: 2.6,
    walls: fp ? polygonWalls(fp.points) : perimeter ? rectWalls(w, l) : [],
    openings: [],
    furniture: [], // see addFurnitureItem
    texts: [], // movable text annotations — see addText
    materials: { floor: 'oak', wall: '#EBE4D8' },
    ...(fp ? { footprint: fp.points } : {}),
  };
}

// Replace the plan's outer boundary with an arbitrary polygon (the freeform
// "draw your outline" action). Interior walls and furniture are shifted with the
// new origin so they stay put; openings that were cut into the old perimeter are
// dropped (those walls no longer exist).
export function setFootprint(plan, points) {
  if (!points || points.length < 3) return plan;
  const { points: pts, minX, minY, width, length } = normalizePolygon(points);
  const perimeterIds = new Set(plan.walls.filter((w) => w.perimeter).map((w) => w.id));
  const interior = plan.walls
    .filter((w) => !w.perimeter)
    .map((w) => ({ ...w, x1: w.x1 - minX, y1: w.y1 - minY, x2: w.x2 - minX, y2: w.y2 - minY }));
  return {
    ...plan,
    width,
    length,
    footprint: pts,
    walls: [...polygonWalls(pts), ...interior],
    openings: plan.openings.filter((o) => !perimeterIds.has(o.wallId)),
    furniture: plan.furniture.map((f) => ({ ...f, x: f.x - minX, y: f.y - minY })),
  };
}

export function snap(value, step = GRID_STEP) {
  return Math.round(value / step) * step;
}

export function wallLength(wall) {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
}

// Point at parameter t (0..1) along a wall's centerline.
export function pointAlongWall(wall, t) {
  return { x: wall.x1 + (wall.x2 - wall.x1) * t, y: wall.y1 + (wall.y2 - wall.y1) * t };
}

// Ramer-Douglas-Peucker simplification of a polyline (open, endpoints kept).
// Used to turn a raw finger-drawn stroke (dozens/hundreds of points) into a
// clean set of wall corners.
export function simplifyPolyline(points, epsilon = 0.12) {
  if (!points || points.length < 3) return points ? [...points] : [];
  const perpDist = (p, a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    const cx = a.x + t * dx;
    const cy = a.y + t * dy;
    return Math.hypot(p.x - cx, p.y - cy);
  };
  const rdp = (pts) => {
    if (pts.length < 3) return pts;
    const [first, last] = [pts[0], pts[pts.length - 1]];
    let maxDist = -1;
    let idx = -1;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = perpDist(pts[i], first, last);
      if (d > maxDist) {
        maxDist = d;
        idx = i;
      }
    }
    if (maxDist > epsilon) {
      const left = rdp(pts.slice(0, idx + 1));
      const right = rdp(pts.slice(idx));
      return [...left.slice(0, -1), ...right];
    }
    return [first, last];
  };
  return rdp(points);
}

// Shoelace area of a polygon in m², rounded to 0.1 like areaM2.
export function polygonArea(points) {
  if (!points || points.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.round((Math.abs(a) / 2) * 10) / 10;
}

export function planArea(plan) {
  if (plan.footprint && plan.footprint.length >= 3) return polygonArea(plan.footprint);
  return areaM2(plan.width, plan.length);
}

// ---- Walls ---------------------------------------------------------------

export function addWall(plan, { x1, y1, x2, y2, thickness = DEFAULT_WALL_THICKNESS }) {
  if (Math.hypot(x2 - x1, y2 - y1) < 0.05) return plan; // ignore zero-length
  const wall = { id: uid('wall'), x1, y1, x2, y2, thickness, perimeter: false };
  return { ...plan, walls: [...plan.walls, wall] };
}

export function removeWall(plan, id) {
  return {
    ...plan,
    walls: plan.walls.filter((w) => w.id !== id),
    openings: plan.openings.filter((o) => o.wallId !== id),
  };
}

// The four sides of a room rectangle, in creation order. Stored on each wall as
// `side` so `updateRoomRect` can rewrite geometry by side and the room sheet can
// label each wall (Top / Right / Bottom / Left).
const ROOM_SIDES = ['top', 'right', 'bottom', 'left'];

// Corner endpoints for a room rectangle, per side.
function roomCorners(x, y, w, h) {
  return {
    top: [x, y, x + w, y],
    right: [x + w, y, x + w, y + h],
    bottom: [x + w, y + h, x, y + h],
    left: [x, y + h, x, y],
  };
}

// Add a rectangular room / partition block as four interior walls that share a
// `group` id, so the editor can select and edit the whole rectangle as one unit
// while the model keeps rendering plain walls (3D / export are unaffected).
export function addRoomRect(plan, x, y, w, h, thickness = DEFAULT_WALL_THICKNESS) {
  const group = uid('room');
  const corners = roomCorners(x, y, w, h);
  const walls = ROOM_SIDES.map((side) => {
    const [x1, y1, x2, y2] = corners[side];
    return { id: uid('wall'), x1, y1, x2, y2, thickness, perimeter: false, group, side };
  });
  return { ...plan, walls: [...plan.walls, ...walls] };
}

// ---- Rooms (grouped-wall rectangles) -------------------------------------

// Derive every room group from the grouped interior walls: its member walls and
// the axis-aligned bounding box { x, y, w, h } spanning their endpoints.
export function roomGroups(plan) {
  const byGroup = new Map();
  for (const wall of plan.walls || []) {
    if (!wall.group) continue;
    if (!byGroup.has(wall.group)) byGroup.set(wall.group, []);
    byGroup.get(wall.group).push(wall);
  }
  const out = [];
  for (const [id, walls] of byGroup) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const w of walls) {
      minX = Math.min(minX, w.x1, w.x2);
      minY = Math.min(minY, w.y1, w.y2);
      maxX = Math.max(maxX, w.x1, w.x2);
      maxY = Math.max(maxY, w.y1, w.y2);
    }
    out.push({ id, walls, x: minX, y: minY, w: maxX - minX, h: maxY - minY });
  }
  return out;
}

export function roomById(plan, groupId) {
  return roomGroups(plan).find((r) => r.id === groupId) || null;
}

// Rewrite a room group's four walls to a new rectangle, keeping wall ids (so any
// openings cut into them survive) and each wall's own thickness.
export function updateRoomRect(plan, groupId, { x, y, w, h }) {
  const corners = roomCorners(x, y, w, h);
  return {
    ...plan,
    walls: plan.walls.map((wall) => {
      if (wall.group !== groupId || !wall.side) return wall;
      const [x1, y1, x2, y2] = corners[wall.side] || [wall.x1, wall.y1, wall.x2, wall.y2];
      return { ...wall, x1, y1, x2, y2 };
    }),
  };
}

// Generic single-wall patch (used for per-wall thickness edits).
export function updateWall(plan, wallId, patch) {
  return {
    ...plan,
    walls: plan.walls.map((w) => (w.id === wallId ? { ...w, ...patch } : w)),
  };
}

// Per-room floor tint — stored as `color` on all four grouped walls so the 2D
// canvas can fill the room's footprint. Purely a 2D concept (3D/export ignore it).
export function setRoomColor(plan, groupId, color) {
  return {
    ...plan,
    walls: plan.walls.map((w) => (w.group === groupId ? { ...w, color } : w)),
  };
}

export function removeRoom(plan, groupId) {
  const removed = new Set(plan.walls.filter((w) => w.group === groupId).map((w) => w.id));
  return {
    ...plan,
    walls: plan.walls.filter((w) => w.group !== groupId),
    openings: plan.openings.filter((o) => !removed.has(o.wallId)),
  };
}

// Clone a room, offset by 30 cm, with a fresh group + wall ids. Openings are not
// copied (they reference the source walls).
export function duplicateRoom(plan, groupId) {
  const room = roomById(plan, groupId);
  if (!room) return plan;
  const g = uid('room');
  const copies = room.walls.map((w) => ({
    ...w,
    id: uid('wall'),
    group: g,
    x1: w.x1 + 0.3,
    y1: w.y1 + 0.3,
    x2: w.x2 + 0.3,
    y2: w.y2 + 0.3,
  }));
  return { ...plan, walls: [...plan.walls, ...copies] };
}

// Mirror a room horizontally about its own center: reflect x and swap the
// left/right wall thicknesses so the room reads flipped.
export function mirrorRoom(plan, groupId) {
  const room = roomById(plan, groupId);
  if (!room) return plan;
  const cx = room.x + room.w / 2;
  const thick = {};
  for (const w of room.walls) thick[w.side] = w.thickness;
  const swap = { top: 'top', bottom: 'bottom', left: 'right', right: 'left' };
  return {
    ...plan,
    walls: plan.walls.map((w) => {
      if (w.group !== groupId) return w;
      return {
        ...w,
        x1: 2 * cx - w.x1,
        x2: 2 * cx - w.x2,
        thickness: thick[swap[w.side]] ?? w.thickness,
      };
    }),
  };
}

// Distance from a point to a wall segment, plus the closest t (0..1).
export function wallHit(wall, pt) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len2 = dx * dx + dy * dy || 1e-6;
  let t = ((pt.x - wall.x1) * dx + (pt.y - wall.y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = wall.x1 + t * dx;
  const py = wall.y1 + t * dy;
  return { t, dist: Math.hypot(pt.x - px, pt.y - py) };
}

// Nearest wall to a point within maxDist (meters). Returns { wall, t, dist }.
export function nearestWallHit(plan, pt, maxDist = 0.6) {
  let best = null;
  for (const wall of plan.walls) {
    const { t, dist } = wallHit(wall, pt);
    if (dist <= maxDist && (!best || dist < best.dist)) best = { wall, t, dist };
  }
  return best;
}

// ---- Openings ------------------------------------------------------------

export function addOpening(plan, { wallId, kind, t }) {
  const wall = plan.walls.find((w) => w.id === wallId);
  if (!wall) return plan;
  const def = OPENING_DEFAULTS[kind] || OPENING_DEFAULTS.door;
  const L = wallLength(wall);
  const halfFrac = def.width / 2 / L;
  const clampedT = Math.max(halfFrac, Math.min(1 - halfFrac, t));
  const opening = {
    id: uid('open'),
    wallId,
    kind,
    t: clampedT,
    width: def.width,
    height: def.height,
    sill: def.sill,
  };
  return { ...plan, openings: [...plan.openings, opening] };
}

export function updateOpening(plan, id, patch) {
  return {
    ...plan,
    openings: plan.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
  };
}

export function removeOpening(plan, id) {
  return { ...plan, openings: plan.openings.filter((o) => o.id !== id) };
}

// Doors/windows dropped as *structure items* (from the catalog) sit on top of a
// wall but don't cut it — so in 3D the solid wall keeps filling the doorway and
// you can't see through an open door. This derives a matching wall opening for
// every such item that lines up on a wall (roughly parallel + close enough), so
// the 3D wall builder can carve a real see-through gap the leaf swings into.
// 2D uses the drawn leaf/pane, so this only feeds the 3D wall mesh.
const ITEM_OPENING_KIND = { door: 'door', window: 'window' };

export function itemWallOpenings(plan) {
  if (!plan) return [];
  const out = [];
  for (const f of plan.furniture || []) {
    const shapeType = f.shape?.type;
    const kind =
      ITEM_OPENING_KIND[shapeType] ||
      (f.kind?.toLowerCase().includes('door') || f.catalogId?.includes('door')
        ? 'door'
        : f.kind?.toLowerCase().includes('window') || f.catalogId?.includes('window')
        ? 'window'
        : null);
    if (!kind) continue;

    const { w, h } = itemDims(f);
    let best = null;
    for (const wall of plan.walls || []) {
      const { t, dist } = wallHit(wall, { x: f.x, y: f.y });
      const maxDist = (wall.thickness || DEFAULT_WALL_THICKNESS) / 2 + 0.5;
      if (dist > maxDist) continue;
      const clampedT = Math.max(0.05, Math.min(0.95, t));
      if (!best || dist < best.dist) best = { wall, t: clampedT };
    }
    if (!best) continue;
    out.push({
      id: `item-open-${f.id}`,
      wallId: best.wall.id,
      kind,
      t: best.t,
      width: w,
      height: h,
      sill: kind === 'window' ? (f.elevation ?? 0.85) : 0,
    });
  }
  return out;
}

// ---- Text annotations ----------------------------------------------------
// Free-floating labels (e.g. "Hall") the user places to name areas. Purely a 2D
// overlay concept: the 3D view and OBJ export ignore `plan.texts`. `size` is the
// glyph height in meters so it scales with the plan like everything else.

export function addText(plan, { x, y, text = 'Label', size = 0.5 }) {
  const t = { id: uid('text'), text, x, y, size, rotation: 0 };
  return { ...plan, texts: [...(plan.texts || []), t] };
}

export function updateText(plan, id, patch) {
  return { ...plan, texts: (plan.texts || []).map((t) => (t.id === id ? { ...t, ...patch } : t)) };
}

export function removeText(plan, id) {
  return { ...plan, texts: (plan.texts || []).filter((t) => t.id !== id) };
}

export function duplicateText(plan, id) {
  const src = (plan.texts || []).find((t) => t.id === id);
  if (!src) return plan;
  const copy = { ...src, id: uid('text'), x: src.x + 0.3, y: src.y + 0.3 };
  return { ...plan, texts: [...(plan.texts || []), copy] };
}

// ---- Materials -----------------------------------------------------------

export function setMaterials(plan, patch) {
  return { ...plan, materials: { ...(plan.materials || {}), ...patch } };
}

// ---- Furniture -----------------------------------------------------------

// Add a furniture / structure instance from a catalog item at a plan position
// (meters). `sx`/`sy` are per-axis stretch factors (1 = catalog size) driven by
// the 8-point manipulation box; `scale` stays a uniform multiplier (also height).
// Structure shells carry `structure` + `shape` so the renderer draws walls /
// treads instead of a plain glyph box.
export function addFurnitureItem(plan, catalogItem, position) {
  const item = {
    id: uid('furn'),
    catalogId: catalogItem.id,
    kind: catalogItem.kind,
    name: catalogItem.name,
    // footprint in meters (catalog stores cm)
    w: catalogItem.dimensions.w / 100,
    d: catalogItem.dimensions.d / 100,
    h: catalogItem.dimensions.h / 100,
    x: position?.x ?? plan.width / 2,
    y: position?.y ?? plan.length / 2,
    rotation: 0,
    scale: 1,
    sx: 1,
    sy: 1,
    mirrored: false, // horizontal flip (see 2D FurnitureShape / 3D PlacedItem)
    color: catalogItem.colors?.[0] ?? '#BC5B3A',
    // Per-part color overrides (empty = use the builder's defaults) and the
    // height off the floor slab in meters (0 for floor items, > 0 for wall
    // items like TV/AC). See src/data/itemEditor.js.
    parts: {},
    elevation: defaultElevation(catalogItem.kind),
    ...(catalogItem.structure ? { structure: true, shape: structureShape(catalogItem) } : {}),
  };
  return { ...plan, furniture: [...plan.furniture, item] };
}

// Clone a catalog shape for a placed instance. Polygon shells (square / L / U / T
// rooms, landing) get an editable `points` list in local meters so every corner
// can be dragged independently; other shapes are copied as-is.
function structureShape(catalogItem) {
  const shape = catalogItem.shape || {};
  if (shape.type === 'polygon') {
    const w = catalogItem.dimensions.w / 100;
    const d = catalogItem.dimensions.d / 100;
    const points = polygonLocalPoints(shape.kind, w, d);
    return points ? { ...shape, points } : { ...shape };
  }
  return { ...shape };
}

// Build a new room shell from a freehand-drawn outline (world/plan meters,
// ordered around the shape). Mirrors the `structure` branch of
// addFurnitureItem, but there's no fixed catalog entry to clone the shape
// from — the drawn points *are* the shape, re-centered on their bounding box
// like every other polygon shell's `shape.points`.
export function addCustomStructure(plan, worldPoints) {
  if (!worldPoints || worldPoints.length < 3) return plan;
  const xs = worldPoints.map((p) => p.x);
  const ys = worldPoints.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rnd = (v) => Math.round(v * 1000) / 1000;
  const points = worldPoints.map((p) => ({ x: rnd(p.x - cx), y: rnd(p.y - cy) }));
  const item = {
    id: uid('furn'),
    catalogId: 'custom-shape',
    kind: 'roomCustom',
    name: 'Custom Room',
    w: rnd(maxX - minX) || 0.1,
    d: rnd(maxY - minY) || 0.1,
    h: plan.wallHeight ?? 2.6,
    x: cx,
    y: cy,
    rotation: 0,
    scale: 1,
    sx: 1,
    sy: 1,
    mirrored: false,
    color: SHELL[0],
    parts: {},
    elevation: 0,
    structure: true,
    shape: { type: 'polygon', points },
  };
  return { ...plan, furniture: [...plan.furniture, item] };
}

// True for room-shell structures whose outline is an editable polygon.
export function isPolygonStructure(f) {
  return !!(f?.structure && f.shape?.type === 'polygon');
}

// Remove one wall from a polygon shell without touching its corners: the edge
// index is flagged "open" so the renderer skips that segment's stroke (a gap
// in the wall) while the floor fill and every other wall stay put. Indices
// stay stable across edits since points are never deleted.
export function openStructureEdge(plan, itemId, edgeIndex) {
  return {
    ...plan,
    furniture: plan.furniture.map((f) => {
      if (f.id !== itemId || !isPolygonStructure(f)) return f;
      const open = new Set(f.shape.openEdges || []);
      open.add(edgeIndex);
      return { ...f, shape: { ...f.shape, openEdges: [...open] } };
    }),
  };
}

// Editable vertex list (local meters, centered on the item origin) for a polygon
// structure. Falls back to deriving points from the kind's outline for items saved
// before per-corner editing existed.
export function structureLocalPoints(f) {
  if (!isPolygonStructure(f)) return null;
  if (Array.isArray(f.shape.points) && f.shape.points.length >= 3) return f.shape.points;
  const s = f.scale ?? 1;
  return polygonLocalPoints(f.shape.kind, f.w * s * (f.sx ?? 1), f.d * s * (f.sy ?? 1)) ||
    (shapePolygon(f.shape.kind) || []).map(([nx, ny]) => ({ x: nx - 0.5, y: ny - 0.5 }));
}

// Axis-aligned bounds of a polygon structure's points in its local frame.
export function structureLocalBounds(f) {
  const pts = structureLocalPoints(f);
  if (!pts || !pts.length) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

// Effective footprint of a placed item in meters, combining the uniform `scale`
// with the per-axis `sx`/`sy`. Both default to 1 so items saved before the
// 8-point box (no sx/sy) render exactly as before. Single source of truth for
// the 2D editor, 3D view and OBJ exporter.
export function itemDims(f) {
  const s = f.scale ?? 1;
  // Polygon shells carry their own edited vertices — their footprint is the
  // bounding box of those points, so a dragged corner grows/shrinks the item.
  if (isPolygonStructure(f) && Array.isArray(f.shape.points) && f.shape.points.length >= 3) {
    const b = structureLocalBounds(f);
    return { w: b.maxX - b.minX, d: b.maxY - b.minY, h: f.h * s };
  }
  return {
    w: f.w * s * (f.sx ?? 1),
    d: f.d * s * (f.sy ?? 1),
    h: f.h * s,
  };
}

export function updateFurnitureItem(plan, id, patch) {
  return {
    ...plan,
    furniture: plan.furniture.map((f) => (f.id === id ? { ...f, ...patch } : f)),
  };
}

export function removeFurnitureItem(plan, id) {
  return { ...plan, furniture: plan.furniture.filter((f) => f.id !== id) };
}

export function duplicateFurnitureItem(plan, id) {
  const src = plan.furniture.find((f) => f.id === id);
  if (!src) return plan;
  const copy = { ...src, id: uid('furn'), x: src.x + 0.3, y: src.y + 0.3 };
  return { ...plan, furniture: [...plan.furniture, copy] };
}

// Resize the room, regenerating perimeter walls (keeping interior walls) and
// clamping furniture inside. Openings keep their stable perimeter wall ids.
export function resizePlan(plan, width, length) {
  // Footprint plans scale the polygon (and everything inside) proportionally,
  // since there is no single width/length rectangle to regenerate.
  if (plan.footprint && plan.footprint.length >= 3) {
    const sx = plan.width ? width / plan.width : 1;
    const sy = plan.length ? length / plan.length : 1;
    const footprint = plan.footprint.map((p) => ({
      x: Math.round(p.x * sx * 1000) / 1000,
      y: Math.round(p.y * sy * 1000) / 1000,
    }));
    const scaledInterior = plan.walls
      .filter((w) => !w.perimeter)
      .map((w) => ({ ...w, x1: w.x1 * sx, y1: w.y1 * sy, x2: w.x2 * sx, y2: w.y2 * sy }));
    return {
      ...plan,
      width,
      length,
      footprint,
      walls: [...polygonWalls(footprint), ...scaledInterior],
      furniture: plan.furniture.map((f) => ({ ...f, x: f.x * sx, y: f.y * sy })),
    };
  }
  const interior = plan.walls
    .filter((w) => !w.perimeter)
    .map((w) => ({
      ...w,
      x1: Math.min(Math.max(w.x1, 0), width),
      y1: Math.min(Math.max(w.y1, 0), length),
      x2: Math.min(Math.max(w.x2, 0), width),
      y2: Math.min(Math.max(w.y2, 0), length),
    }));
  return {
    ...plan,
    width,
    length,
    walls: [...rectWalls(width, length), ...interior],
    furniture: plan.furniture.map((f) => ({
      ...f,
      x: Math.min(Math.max(f.x, 0), width),
      y: Math.min(Math.max(f.y, 0), length),
    })),
  };
}
