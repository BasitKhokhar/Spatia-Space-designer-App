// Construction estimation catalog. Quantities are derived from the building's
// covered area (sq ft) × storeys using transparent, editable rules-of-thumb
// coefficients — these are approximate takeoffs, not a substitute for a detailed
// engineered BOQ. Mirrors the data-module convention (ALL-CAPS array + xById).
//
// Each item declares how its quantity is derived via `basis`:
//   'area'    → qty = ceil(perSqft × coveredAreaSqft × storeys)
//   'count'   → qty = ceil(coveredAreaSqft × storeys / countPer)  (e.g. doors)
//   'percent' → not a quantity; the entered value is a % of the subtotal
//               (contingency). Handled specially by computeEstimate.
//
// `stage` groups items into the flow: 'grey' is the first pass; the rest
// ('finishing' | 'fixture' | 'labor') are offered as the "interior & finishing"
// continuation after the grey-structure summary.

export const CONSTRUCTION_ITEMS = [
  // ---- Grey structure (phase 1) ------------------------------------------
  { id: 'brick', label: 'Bricks', unit: 'nos', stage: 'grey', basis: 'area', perSqft: 8, icon: 'grid', hint: 'Standard 9×4.5×3 in bricks' },
  { id: 'cement', label: 'Cement', unit: 'bag', stage: 'grey', basis: 'area', perSqft: 0.4, icon: 'building', hint: '50 kg bags — structure & masonry' },
  { id: 'steel', label: 'Steel / Iron', unit: 'kg', stage: 'grey', basis: 'area', perSqft: 4, icon: 'wall', hint: 'Rebar for RCC members' },
  { id: 'sand', label: 'Sand', unit: 'cft', stage: 'grey', basis: 'area', perSqft: 1.8, icon: 'polygon', hint: 'Fine aggregate' },
  { id: 'crush', label: 'Crush / Aggregate', unit: 'cft', stage: 'grey', basis: 'area', perSqft: 1.35, icon: 'cube', hint: 'Coarse aggregate' },

  // ---- Finishing ----------------------------------------------------------
  { id: 'plaster', label: 'Plaster', unit: 'sqft', stage: 'finishing', basis: 'area', perSqft: 3.4, icon: 'square', hint: 'Wall & ceiling plaster area' },
  { id: 'paint', label: 'Paint', unit: 'sqft', stage: 'finishing', basis: 'area', perSqft: 3.4, icon: 'palette', hint: 'Painted wall & ceiling area' },
  { id: 'tiles', label: 'Tiles / Flooring', unit: 'sqft', stage: 'finishing', basis: 'area', perSqft: 1, icon: 'grid', hint: 'Floor covering area' },

  // ---- Fixtures -----------------------------------------------------------
  { id: 'door', label: 'Doors', unit: 'nos', stage: 'fixture', basis: 'count', countPer: 150, icon: 'door', hint: '≈ 1 per 150 sq ft' },
  { id: 'window', label: 'Windows', unit: 'nos', stage: 'fixture', basis: 'count', countPer: 120, icon: 'window', hint: '≈ 1 per 120 sq ft' },
  { id: 'electrical', label: 'Electrical', unit: 'sqft', stage: 'fixture', basis: 'area', perSqft: 1, icon: 'sun', hint: 'Wiring & points (per sq ft)' },
  { id: 'plumbing', label: 'Plumbing', unit: 'sqft', stage: 'fixture', basis: 'area', perSqft: 1, icon: 'ruler', hint: 'Piping & fittings (per sq ft)' },

  // ---- Labor & extras -----------------------------------------------------
  { id: 'labor', label: 'Labour', unit: 'sqft', stage: 'labor', basis: 'area', perSqft: 1, icon: 'walk', hint: 'Construction labour (per sq ft)' },
  { id: 'contingency', label: 'Contingency', unit: '%', stage: 'labor', basis: 'percent', icon: 'shield', hint: 'Buffer applied to the subtotal' },
];

// Stages that make up the optional "interior & finishing" continuation.
export const INTERIOR_STAGES = ['finishing', 'fixture', 'labor'];

export function itemsForStage(stage) {
  return CONSTRUCTION_ITEMS.filter((it) => it.stage === stage);
}

export function greyItems() {
  return itemsForStage('grey');
}

export function interiorItems() {
  return CONSTRUCTION_ITEMS.filter((it) => INTERIOR_STAGES.includes(it.stage));
}

export function itemById(id) {
  return CONSTRUCTION_ITEMS.find((it) => it.id === id) || null;
}
