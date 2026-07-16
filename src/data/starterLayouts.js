// Starter layouts: fixtures pre-placed when a room of a given type is created.
// Coordinates are FRACTIONS of the room (fx, fy in 0..1); `r` is rotation in
// degrees. They scale to whatever dimensions the user picks. Shop rooms open
// with a working layout (racks + counter) so users start from something real.
import { addFurnitureItem, updateFurnitureItem } from '@/domain/floorplan';
import { catalogById } from './catalog';

const LAYOUTS = {
  // ---- Home ----
  living: [
    { id: 'area-rug', fx: 0.5, fy: 0.6 },
    { id: 'loft-sofa', fx: 0.5, fy: 0.78 },
    { id: 'oak-coffee-table', fx: 0.5, fy: 0.56 },
    { id: 'flat-tv', fx: 0.5, fy: 0.1 },
    { id: 'fig-tree', fx: 0.86, fy: 0.2 },
  ],
  bedroom: [
    { id: 'king-bed', fx: 0.5, fy: 0.35 },
    { id: 'nightstand', fx: 0.18, fy: 0.16 },
    { id: 'nightstand', fx: 0.82, fy: 0.16 },
    { id: 'wardrobe', fx: 0.85, fy: 0.8, r: 90 },
  ],
  kitchen: [
    { id: 'kitchen-island', fx: 0.5, fy: 0.55 },
    { id: 'refrigerator', fx: 0.15, fy: 0.18 },
    { id: 'range-cooker', fx: 0.5, fy: 0.1 },
    { id: 'kitchen-sink', fx: 0.8, fy: 0.1 },
  ],
  bathroom: [
    { id: 'bathtub', fx: 0.5, fy: 0.22 },
    { id: 'toilet', fx: 0.16, fy: 0.82 },
    { id: 'vanity-basin', fx: 0.78, fy: 0.82 },
  ],
  office: [
    { id: 'writing-desk', fx: 0.5, fy: 0.3 },
    { id: 'office-chair', fx: 0.5, fy: 0.5 },
    { id: 'bookshelf', fx: 0.15, fy: 0.2, r: 90 },
  ],
  dining: [
    { id: 'dining-table', fx: 0.5, fy: 0.5 },
    { id: 'dining-chair', fx: 0.3, fy: 0.5 },
    { id: 'dining-chair', fx: 0.7, fy: 0.5 },
    { id: 'sideboard', fx: 0.5, fy: 0.12 },
  ],

  // ---- Shop / Retail ----
  retail: [
    { id: 'checkout-counter', fx: 0.2, fy: 0.85 },
    { id: 'mannequin', fx: 0.15, fy: 0.14 },
    { id: 'mannequin', fx: 0.85, fy: 0.14 },
    { id: 'clothing-rack', fx: 0.3, fy: 0.32 },
    { id: 'clothing-rack', fx: 0.5, fy: 0.32 },
    { id: 'clothing-rack', fx: 0.7, fy: 0.32 },
    { id: 'clothing-rack', fx: 0.3, fy: 0.55 },
    { id: 'clothing-rack', fx: 0.5, fy: 0.55 },
    { id: 'clothing-rack', fx: 0.7, fy: 0.55 },
    { id: 'fitting-room', fx: 0.85, fy: 0.8 },
    { id: 'signage-stand', fx: 0.5, fy: 0.92 },
  ],
  boutique: [
    { id: 'cash-wrap', fx: 0.2, fy: 0.85 },
    { id: 'mannequin', fx: 0.2, fy: 0.14 },
    { id: 'mannequin', fx: 0.8, fy: 0.14 },
    { id: 'round-rack', fx: 0.35, fy: 0.38 },
    { id: 'round-rack', fx: 0.65, fy: 0.38 },
    { id: 'clothing-rack', fx: 0.5, fy: 0.62 },
    { id: 'fitting-room', fx: 0.82, fy: 0.8 },
  ],
  grocery: [
    { id: 'produce-bin', fx: 0.15, fy: 0.18 },
    { id: 'produce-bin', fx: 0.32, fy: 0.18 },
    { id: 'gondola-shelf', fx: 0.35, fy: 0.4 },
    { id: 'gondola-shelf', fx: 0.35, fy: 0.55 },
    { id: 'gondola-shelf', fx: 0.6, fy: 0.4 },
    { id: 'gondola-shelf', fx: 0.6, fy: 0.55 },
    { id: 'display-fridge', fx: 0.9, fy: 0.4, r: 90 },
    { id: 'chest-freezer', fx: 0.85, fy: 0.68 },
    { id: 'basket-stack', fx: 0.1, fy: 0.82 },
    { id: 'checkout-counter', fx: 0.28, fy: 0.9 },
    { id: 'checkout-counter', fx: 0.5, fy: 0.9 },
  ],
  cafe: [
    { id: 'shelf-endcap-cafe', fx: 0.5, fy: 0.88 },
    { id: 'round-dining', fx: 0.3, fy: 0.35 },
    { id: 'round-dining', fx: 0.62, fy: 0.35 },
    { id: 'round-dining', fx: 0.3, fy: 0.6 },
    { id: 'round-dining', fx: 0.62, fy: 0.6 },
    { id: 'signage-stand', fx: 0.15, fy: 0.86 },
  ],
  salon: [
    { id: 'salon-station', fx: 0.25, fy: 0.3, r: 180 },
    { id: 'salon-station', fx: 0.25, fy: 0.58, r: 180 },
    { id: 'salon-station', fx: 0.75, fy: 0.3, r: 180 },
    { id: 'salon-station', fx: 0.75, fy: 0.58, r: 180 },
    { id: 'cash-wrap', fx: 0.2, fy: 0.88 },
    { id: 'signage-stand', fx: 0.8, fy: 0.88 },
  ],
  warehouse: [
    { id: 'wall-shelving', fx: 0.2, fy: 0.22, r: 90 },
    { id: 'wall-shelving', fx: 0.2, fy: 0.45, r: 90 },
    { id: 'wall-shelving', fx: 0.2, fy: 0.68, r: 90 },
    { id: 'wall-shelving', fx: 0.5, fy: 0.22, r: 90 },
    { id: 'wall-shelving', fx: 0.5, fy: 0.45, r: 90 },
    { id: 'wall-shelving', fx: 0.5, fy: 0.68, r: 90 },
    { id: 'wall-shelving', fx: 0.8, fy: 0.22, r: 90 },
    { id: 'wall-shelving', fx: 0.8, fy: 0.45, r: 90 },
    { id: 'wall-shelving', fx: 0.8, fy: 0.68, r: 90 },
    { id: 'checkout-counter', fx: 0.2, fy: 0.9 },
  ],
};

export function hasStarterLayout(roomTypeId) {
  return Array.isArray(LAYOUTS[roomTypeId]);
}

// Apply a room type's starter layout to a fresh plan.
export function seedPlan(plan, roomTypeId) {
  const seeds = LAYOUTS[roomTypeId];
  if (!seeds) return plan;
  return seeds.reduce((p, s) => {
    const item = catalogById(s.id);
    if (!item) return p;
    const next = addFurnitureItem(p, item, { x: s.fx * p.width, y: s.fy * p.length });
    const added = next.furniture[next.furniture.length - 1];
    return s.r ? updateFurnitureItem(next, added.id, { rotation: s.r }) : next;
  }, plan);
}
