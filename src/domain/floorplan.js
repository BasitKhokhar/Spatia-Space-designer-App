import { uid } from '@/utils/id';
import { areaM2 } from './units';

// ---------------------------------------------------------------------------
// The floor-plan model is the single source of truth shared by the 2D editor,
// the 3D view, and the OBJ exporter. All coordinates are in METERS, with the
// room's top-left corner at (0,0) and +x right, +y "down" in plan space.
// ---------------------------------------------------------------------------

export const DEFAULT_WALL_THICKNESS = 0.12; // 12 cm
export const GRID_STEP = 0.1; // snap resolution in meters

// Build the four perimeter walls for a rectangular room.
export function rectWalls(width, length, thickness = DEFAULT_WALL_THICKNESS) {
  return [
    { id: uid('wall'), x1: 0, y1: 0, x2: width, y2: 0, thickness },
    { id: uid('wall'), x1: width, y1: 0, x2: width, y2: length, thickness },
    { id: uid('wall'), x1: width, y1: length, x2: 0, y2: length, thickness },
    { id: uid('wall'), x1: 0, y1: length, x2: 0, y2: 0, thickness },
  ];
}

// Create a fresh floor plan for a room of the given size.
export function createFloorPlan({ width = 4.2, length = 3.6 } = {}) {
  return {
    width,
    length,
    wallHeight: 2.6,
    walls: rectWalls(width, length),
    openings: [], // { id, wallId, kind: 'door'|'window', offset, size }
    furniture: [], // see addFurnitureItem
  };
}

export function snap(value, step = GRID_STEP) {
  return Math.round(value / step) * step;
}

export function wallLength(wall) {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
}

export function planArea(plan) {
  return areaM2(plan.width, plan.length);
}

// Add a furniture instance from a catalog item at a plan position (meters).
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
    color: catalogItem.colors?.[0] ?? '#BC5B3A',
  };
  return { ...plan, furniture: [...plan.furniture, item] };
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

// Resize the room, regenerating perimeter walls and clamping furniture inside.
export function resizePlan(plan, width, length) {
  return {
    ...plan,
    width,
    length,
    walls: rectWalls(width, length),
    furniture: plan.furniture.map((f) => ({
      ...f,
      x: Math.min(Math.max(f.x, 0), width),
      y: Math.min(Math.max(f.y, 0), length),
    })),
  };
}
