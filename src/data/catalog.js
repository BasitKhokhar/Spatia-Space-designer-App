// Furniture catalog seed. `kind` maps to a FurnitureGlyph / 3D mesh type.
// dimensions are in centimeters (w x d x h). colors are selectable swatches.
export const CATEGORIES = ['All', 'Sofas', 'Tables', 'Lighting', 'Beds', 'Chairs', 'Decor'];

const SWATCHES = ['#BC5B3A', '#4E7C59', '#8A6250', '#3E4A5C', '#D8D2C4'];

export const CATALOG = [
  {
    id: 'loft-sofa',
    name: 'Loft Sofa',
    category: 'Sofas',
    kind: 'sofa',
    dimensions: { w: 220, d: 95, h: 85 },
    colors: SWATCHES,
  },
  {
    id: 'arc-lamp',
    name: 'Arc Floor Lamp',
    category: 'Lighting',
    kind: 'lamp',
    dimensions: { w: 60, d: 60, h: 180 },
    colors: ['#E4A188', '#D8D2C4', '#3E4A5C'],
  },
  {
    id: 'oak-coffee-table',
    name: 'Oak Coffee Table',
    category: 'Tables',
    kind: 'table',
    dimensions: { w: 110, d: 55, h: 42 },
    colors: ['#8A6250', '#6E5240', '#D8D2C4'],
  },
  {
    id: 'fig-tree',
    name: 'Potted Fig Tree',
    category: 'Decor',
    kind: 'plant',
    dimensions: { w: 60, d: 60, h: 150 },
    colors: ['#4E7C59', '#6FA57C'],
  },
  {
    id: 'linen-bed',
    name: 'Linen Queen Bed',
    category: 'Beds',
    kind: 'bed',
    dimensions: { w: 160, d: 210, h: 110 },
    colors: SWATCHES,
  },
  {
    id: 'accent-chair',
    name: 'Accent Chair',
    category: 'Chairs',
    kind: 'chair',
    dimensions: { w: 70, d: 75, h: 90 },
    colors: SWATCHES,
  },
  {
    id: 'dining-table',
    name: 'Dining Table',
    category: 'Tables',
    kind: 'table',
    dimensions: { w: 180, d: 90, h: 75 },
    colors: ['#8A6250', '#6E5240'],
  },
  {
    id: 'pendant-light',
    name: 'Pendant Light',
    category: 'Lighting',
    kind: 'lamp',
    dimensions: { w: 40, d: 40, h: 50 },
    colors: ['#C79A45', '#1B1A17', '#D8D2C4'],
  },
];

export function catalogById(id) {
  return CATALOG.find((c) => c.id === id);
}
