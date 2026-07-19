import { uid } from '@/utils/id';
import { areaM2 } from './units';
import { defaultElevation } from '@/data/itemEditor';

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
export function createFloorPlan({ width = 4.2, length = 3.6, footprint = null } = {}) {
  const fp = footprint && footprint.length >= 3 ? normalizePolygon(footprint) : null;
  const w = fp ? fp.width : width;
  const l = fp ? fp.length : length;
  return {
    width: w,
    length: l,
    wallHeight: 2.6,
    walls: fp ? polygonWalls(fp.points) : rectWalls(w, l),
    openings: [],
    furniture: [], // see addFurnitureItem
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

// Add a rectangular room / partition block as four interior walls.
export function addRoomRect(plan, x, y, w, h, thickness = DEFAULT_WALL_THICKNESS) {
  const corners = [
    [x, y, x + w, y],
    [x + w, y, x + w, y + h],
    [x + w, y + h, x, y + h],
    [x, y + h, x, y],
  ];
  const walls = corners.map(([x1, y1, x2, y2]) => ({
    id: uid('wall'),
    x1,
    y1,
    x2,
    y2,
    thickness,
    perimeter: false,
  }));
  return { ...plan, walls: [...plan.walls, ...walls] };
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
  const out = [];
  for (const f of plan.furniture || []) {
    if (!f.structure) continue;
    const kind = ITEM_OPENING_KIND[f.shape?.type];
    if (!kind) continue;
    const { w, h } = itemDims(f);
    const rad = ((f.rotation || 0) * Math.PI) / 180;
    const dir = { x: Math.cos(rad), y: Math.sin(rad) }; // item's width axis
    let best = null;
    for (const wall of plan.walls) {
      const L = wallLength(wall) || 1;
      const wdir = { x: (wall.x2 - wall.x1) / L, y: (wall.y2 - wall.y1) / L };
      // must be roughly aligned with the wall to be "in" it (|cos| ~ 1)
      if (Math.abs(dir.x * wdir.x + dir.y * wdir.y) < 0.85) continue;
      const { t, dist } = wallHit(wall, { x: f.x, y: f.y });
      const maxDist = (wall.thickness || DEFAULT_WALL_THICKNESS) / 2 + 0.35;
      if (dist > maxDist) continue;
      if (!best || dist < best.dist) best = { wall, t };
    }
    if (!best) continue;
    out.push({
      id: `item-open-${f.id}`,
      wallId: best.wall.id,
      kind,
      t: best.t,
      width: w,
      height: h,
      // windows sit on a sill (adjustable via the item's `elevation`; older
      // items without one default to 0.85 m); doors run to the floor. The item's
      // own frame overlaps these edges, so a small mismatch reads as trim.
      sill: kind === 'window' ? (f.elevation ?? 0.85) : 0,
    });
  }
  return out;
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
    color: catalogItem.colors?.[0] ?? '#BC5B3A',
    // Per-part color overrides (empty = use the builder's defaults) and the
    // height off the floor slab in meters (0 for floor items, > 0 for wall
    // items like TV/AC). See src/data/itemEditor.js.
    parts: {},
    elevation: defaultElevation(catalogItem.kind),
    ...(catalogItem.structure ? { structure: true, shape: catalogItem.shape } : {}),
  };
  return { ...plan, furniture: [...plan.furniture, item] };
}

// Effective footprint of a placed item in meters, combining the uniform `scale`
// with the per-axis `sx`/`sy`. Both default to 1 so items saved before the
// 8-point box (no sx/sy) render exactly as before. Single source of truth for
// the 2D editor, 3D view and OBJ exporter.
export function itemDims(f) {
  const s = f.scale ?? 1;
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
