import { planArea } from './floorplan';

// Construction cost estimate: pure, React-free math (mirrors cost.js). Given the
// building's measurements (covered area in sq ft × storeys) and the per-unit
// prices the user enters, it derives material quantities from the item
// coefficients and rolls them up into a Bill of Quantities with a grand total.

const M2_TO_SQFT = 10.7639;

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Seed the scope step from a project's floor plan. planArea is in m²; the
// estimator works in sq ft. Defaults to a single storey / 10 ft walls.
export function deriveMeasurements(plan, storeys = 1) {
  const areaM2 = plan ? planArea(plan) : 0;
  return {
    coveredAreaSqft: Math.max(1, Math.round(areaM2 * M2_TO_SQFT)),
    storeys: Math.max(1, storeys),
    wallHeightFt: 10,
  };
}

// Total covered area across every storey (sq ft).
export function totalArea(m) {
  return num(m?.coveredAreaSqft) * Math.max(1, num(m?.storeys) || 1);
}

// Derived quantity for a single item. `percent` items carry no quantity.
export function itemQuantity(item, m) {
  const area = totalArea(m);
  if (item.basis === 'count') return Math.ceil(area / (item.countPer || 1));
  if (item.basis === 'percent') return 0;
  return Math.ceil((item.perSqft || 0) * area);
}

// Build the full estimate. Value items (area/count) are multiplied out first;
// any percent items (e.g. contingency) then apply to that subtotal.
export function computeEstimate(measurements, prices, items) {
  const valueItems = items.filter((it) => it.basis !== 'percent');
  const percentItems = items.filter((it) => it.basis === 'percent');

  const lines = valueItems.map((it) => {
    const qty = itemQuantity(it, measurements);
    const unitPrice = num(prices[it.id]);
    return {
      id: it.id,
      label: it.label,
      unit: it.unit,
      basis: it.basis,
      qty,
      unitPrice,
      amount: qty * unitPrice,
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);

  const percentLines = percentItems.map((it) => {
    const pct = num(prices[it.id]);
    return {
      id: it.id,
      label: it.label,
      unit: it.unit,
      basis: 'percent',
      qty: pct,
      unitPrice: null,
      amount: Math.round((subtotal * pct) / 100),
    };
  });

  const total = subtotal + percentLines.reduce((s, l) => s + l.amount, 0);

  return { lines: [...lines, ...percentLines], subtotal, total };
}
