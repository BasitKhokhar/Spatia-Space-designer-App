// Product catalog. `kind` maps to a FurnitureGlyph / 3D mesh type.
// dimensions are in centimeters (w x d x h). colors are selectable swatches.
// `price` is an approximate MSRP used by the cost estimate. `group` splits the
// library into Home vs Retail so the Shop mode can surface fixtures.
// `tags` widen search matches.

// Category chips shown in the catalog. Ordered Home first, then Retail.
export const CATEGORIES = [
  'All',
  'Sofas',
  'Chairs',
  'Tables',
  'Beds',
  'Storage',
  'Kitchen',
  'Bath',
  'Office',
  'Lighting',
  'Decor',
  'Outdoor',
  'Retail',
  'Clinic',
  'School',
  'Parking',
  'Garden',
];

// Categories that belong to the Shop/Retail library.
export const RETAIL_CATEGORIES = ['Retail'];

// Swatch palettes reused across items.
const FABRIC = ['#BC5B3A', '#4E7C59', '#8A6250', '#3E4A5C', '#D8D2C4'];
const WOOD = ['#8A6250', '#6E5240', '#A87B54', '#D8D2C4'];
const METAL = ['#B8BCC2', '#8B9096', '#3E4A5C', '#1B1A17'];
const NEUTRAL = ['#F4F1EA', '#D8D2C4', '#B8BCC2', '#3E4A5C'];
const APPLIANCE = ['#DDE1E5', '#B8BCC2', '#3E4A5C', '#1B1A17'];
const GREEN = ['#4E7C59', '#6FA57C', '#3E5B45'];

export const CATALOG = [
  // ---- Sofas & seating --------------------------------------------------
  { id: 'loft-sofa', name: 'Loft Sofa', category: 'Sofas', kind: 'sofa', dimensions: { w: 220, d: 95, h: 85 }, colors: FABRIC, price: 1290, tags: ['couch', 'seat'] },
  { id: 'compact-sofa', name: 'Compact 2-Seater', category: 'Sofas', kind: 'sofa', dimensions: { w: 160, d: 88, h: 82 }, colors: FABRIC, price: 890, tags: ['couch', 'loveseat'] },
  { id: 'l-sectional', name: 'L-Shaped Sectional', category: 'Sofas', kind: 'sectional', dimensions: { w: 280, d: 200, h: 84 }, colors: FABRIC, price: 2190, tags: ['corner', 'couch'] },
  { id: 'chaise-lounge', name: 'Chaise Lounge', category: 'Sofas', kind: 'sectional', dimensions: { w: 170, d: 80, h: 78 }, colors: FABRIC, price: 760, tags: ['daybed'] },
  { id: 'ottoman', name: 'Ottoman', category: 'Sofas', kind: 'stool', dimensions: { w: 70, d: 70, h: 42 }, colors: FABRIC, price: 210, tags: ['footstool', 'pouf'] },

  // ---- Chairs -----------------------------------------------------------
  { id: 'accent-chair', name: 'Accent Chair', category: 'Chairs', kind: 'chair', dimensions: { w: 70, d: 75, h: 90 }, colors: FABRIC, price: 340 },
  { id: 'dining-chair', name: 'Dining Chair', category: 'Chairs', kind: 'chair', dimensions: { w: 46, d: 52, h: 92 }, colors: WOOD, price: 120 },
  { id: 'bar-stool', name: 'Bar Stool', category: 'Chairs', kind: 'stool', dimensions: { w: 40, d: 40, h: 105 }, colors: METAL, price: 95 },
  { id: 'office-chair', name: 'Office Chair', category: 'Chairs', kind: 'chair', dimensions: { w: 62, d: 62, h: 115 }, colors: METAL, price: 260, tags: ['task', 'desk'] },
  { id: 'reading-bench', name: 'Reading Bench', category: 'Chairs', kind: 'bench', dimensions: { w: 130, d: 42, h: 46 }, colors: WOOD, price: 220 },

  // ---- Tables -----------------------------------------------------------
  { id: 'oak-coffee-table', name: 'Oak Coffee Table', category: 'Tables', kind: 'table', dimensions: { w: 110, d: 55, h: 42 }, colors: WOOD, price: 280 },
  { id: 'dining-table', name: 'Dining Table', category: 'Tables', kind: 'table', dimensions: { w: 180, d: 90, h: 75 }, colors: WOOD, price: 640 },
  { id: 'round-dining', name: 'Round Dining Table', category: 'Tables', kind: 'roundTable', dimensions: { w: 120, d: 120, h: 75 }, colors: WOOD, price: 560 },
  { id: 'side-table', name: 'Side Table', category: 'Tables', kind: 'nightstand', dimensions: { w: 45, d: 45, h: 55 }, colors: WOOD, price: 130 },
  { id: 'console-table', name: 'Console Table', category: 'Tables', kind: 'table', dimensions: { w: 140, d: 38, h: 80 }, colors: WOOD, price: 300 },

  // ---- Beds -------------------------------------------------------------
  { id: 'linen-bed', name: 'Linen Queen Bed', category: 'Beds', kind: 'bed', dimensions: { w: 160, d: 210, h: 110 }, colors: FABRIC, price: 980 },
  { id: 'king-bed', name: 'King Bed', category: 'Beds', kind: 'bed', dimensions: { w: 193, d: 212, h: 120 }, colors: FABRIC, price: 1240 },
  { id: 'single-bed', name: 'Single Bed', category: 'Beds', kind: 'bed', dimensions: { w: 100, d: 200, h: 100 }, colors: FABRIC, price: 520 },
  { id: 'bunk-bed', name: 'Bunk Bed', category: 'Beds', kind: 'bed', dimensions: { w: 100, d: 200, h: 160 }, colors: WOOD, price: 690 },
  { id: 'nightstand', name: 'Nightstand', category: 'Beds', kind: 'nightstand', dimensions: { w: 45, d: 40, h: 52 }, colors: WOOD, price: 140 },

  // ---- Storage ----------------------------------------------------------
  { id: 'bookshelf', name: 'Bookshelf', category: 'Storage', kind: 'bookshelf', dimensions: { w: 90, d: 32, h: 200 }, colors: WOOD, price: 280 },
  { id: 'wardrobe', name: 'Wardrobe', category: 'Storage', kind: 'wardrobe', dimensions: { w: 150, d: 60, h: 210 }, colors: WOOD, price: 720 },
  { id: 'dresser', name: 'Dresser', category: 'Storage', kind: 'dresser', dimensions: { w: 120, d: 50, h: 85 }, colors: WOOD, price: 430 },
  { id: 'tv-stand', name: 'TV Stand', category: 'Storage', kind: 'tvStand', dimensions: { w: 160, d: 40, h: 50 }, colors: WOOD, price: 310 },
  { id: 'sideboard', name: 'Sideboard', category: 'Storage', kind: 'cabinet', dimensions: { w: 180, d: 45, h: 80 }, colors: WOOD, price: 480 },
  { id: 'shoe-cabinet', name: 'Shoe Cabinet', category: 'Storage', kind: 'cabinet', dimensions: { w: 80, d: 30, h: 100 }, colors: WOOD, price: 160 },
  { id: 'pallet', name: 'Pallet Stack', category: 'Storage', kind: 'bin', dimensions: { w: 120, d: 100, h: 120 }, colors: WOOD, price: 60, tags: ['warehouse', 'crate', 'goods'] },

  // ---- Kitchen ----------------------------------------------------------
  { id: 'kitchen-island', name: 'Kitchen Island', category: 'Kitchen', kind: 'island', dimensions: { w: 180, d: 90, h: 90 }, colors: NEUTRAL, price: 1450 },
  { id: 'base-cabinet', name: 'Base Cabinet Run', category: 'Kitchen', kind: 'counter', dimensions: { w: 200, d: 60, h: 90 }, colors: NEUTRAL, price: 880 },
  { id: 'range-cooker', name: 'Range Cooker', category: 'Kitchen', kind: 'stove', dimensions: { w: 90, d: 60, h: 90 }, colors: APPLIANCE, price: 690 },
  { id: 'refrigerator', name: 'Refrigerator', category: 'Kitchen', kind: 'fridge', dimensions: { w: 70, d: 70, h: 180 }, colors: APPLIANCE, price: 890 },
  { id: 'kitchen-sink', name: 'Sink Unit', category: 'Kitchen', kind: 'sink', dimensions: { w: 80, d: 60, h: 90 }, colors: APPLIANCE, price: 240 },
  { id: 'dishwasher', name: 'Dishwasher', category: 'Kitchen', kind: 'fridge', dimensions: { w: 60, d: 60, h: 85 }, colors: APPLIANCE, price: 450 },

  // ---- Bath -------------------------------------------------------------
  { id: 'bathtub', name: 'Bathtub', category: 'Bath', kind: 'bathtub', dimensions: { w: 170, d: 75, h: 55 }, colors: NEUTRAL, price: 640 },
  { id: 'shower-stall', name: 'Shower Stall', category: 'Bath', kind: 'shower', dimensions: { w: 90, d: 90, h: 200 }, colors: NEUTRAL, price: 520 },
  { id: 'toilet', name: 'Toilet', category: 'Bath', kind: 'toilet', dimensions: { w: 40, d: 65, h: 80 }, colors: NEUTRAL, price: 220 },
  { id: 'vanity-basin', name: 'Vanity Basin', category: 'Bath', kind: 'sink', dimensions: { w: 90, d: 48, h: 85 }, colors: NEUTRAL, price: 360 },

  // ---- Office -----------------------------------------------------------
  { id: 'writing-desk', name: 'Writing Desk', category: 'Office', kind: 'desk', dimensions: { w: 140, d: 60, h: 75 }, colors: WOOD, price: 340 },
  { id: 'l-desk', name: 'L-Shaped Desk', category: 'Office', kind: 'desk', dimensions: { w: 160, d: 160, h: 75 }, colors: WOOD, price: 520 },
  { id: 'filing-cabinet', name: 'Filing Cabinet', category: 'Office', kind: 'cabinet', dimensions: { w: 45, d: 55, h: 105 }, colors: METAL, price: 190 },
  { id: 'meeting-table', name: 'Meeting Table', category: 'Office', kind: 'table', dimensions: { w: 240, d: 110, h: 75 }, colors: WOOD, price: 980 },

  // ---- Lighting ---------------------------------------------------------
  { id: 'arc-lamp', name: 'Arc Floor Lamp', category: 'Lighting', kind: 'lamp', dimensions: { w: 60, d: 60, h: 180 }, colors: ['#E4A188', '#D8D2C4', '#3E4A5C'], price: 210 },
  { id: 'pendant-light', name: 'Pendant Light', category: 'Lighting', kind: 'pendant', dimensions: { w: 40, d: 40, h: 50 }, colors: ['#C79A45', '#1B1A17', '#D8D2C4'], price: 160 },
  { id: 'table-lamp', name: 'Table Lamp', category: 'Lighting', kind: 'lamp', dimensions: { w: 35, d: 35, h: 55 }, colors: ['#E4A188', '#D8D2C4'], price: 90 },
  { id: 'track-light', name: 'Track Lighting', category: 'Lighting', kind: 'pendant', dimensions: { w: 120, d: 12, h: 12 }, colors: METAL, price: 140 },

  // ---- Decor ------------------------------------------------------------
  { id: 'fig-tree', name: 'Potted Fig Tree', category: 'Decor', kind: 'plant', dimensions: { w: 60, d: 60, h: 150 }, colors: GREEN, price: 120 },
  { id: 'area-rug', name: 'Area Rug', category: 'Decor', kind: 'rug', dimensions: { w: 200, d: 140, h: 2 }, colors: FABRIC, price: 180 },
  { id: 'wall-mirror', name: 'Wall Mirror', category: 'Decor', kind: 'mirror', dimensions: { w: 80, d: 5, h: 120 }, colors: METAL, price: 140 },
  { id: 'flat-tv', name: 'Flat-Screen TV', category: 'Decor', kind: 'tv', dimensions: { w: 140, d: 8, h: 82 }, colors: ['#1B1A17', '#3E4A5C'], price: 780 },
  { id: 'floor-plant', name: 'Floor Plant', category: 'Decor', kind: 'plant', dimensions: { w: 45, d: 45, h: 90 }, colors: GREEN, price: 70 },

  // ---- Outdoor ----------------------------------------------------------
  { id: 'patio-set', name: 'Patio Table Set', category: 'Outdoor', kind: 'roundTable', dimensions: { w: 100, d: 100, h: 72 }, colors: METAL, price: 420 },
  { id: 'garden-bench', name: 'Garden Bench', category: 'Outdoor', kind: 'bench', dimensions: { w: 150, d: 55, h: 85 }, colors: WOOD, price: 240 },
  { id: 'planter-box', name: 'Planter Box', category: 'Outdoor', kind: 'planter', dimensions: { w: 100, d: 40, h: 45 }, colors: GREEN, price: 90 },
  { id: 'parasol', name: 'Parasol', category: 'Outdoor', kind: 'plant', dimensions: { w: 300, d: 300, h: 250 }, colors: ['#4E7C59', '#BC5B3A', '#D8D2C4'], price: 180 },

  // ---- Retail / Shop fixtures ------------------------------------------
  { id: 'clothing-rack', name: 'Clothing Rack', category: 'Retail', kind: 'rack', dimensions: { w: 120, d: 55, h: 160 }, colors: METAL, price: 190, group: 'retail', tags: ['rail', 'garment', 'apparel'] },
  { id: 'round-rack', name: 'Round Garment Rack', category: 'Retail', kind: 'roundRack', dimensions: { w: 90, d: 90, h: 150 }, colors: METAL, price: 150, group: 'retail', tags: ['circular', 'rail'] },
  { id: 'wall-rail', name: 'Wall-Mounted Rail', category: 'Retail', kind: 'wallShelf', dimensions: { w: 120, d: 35, h: 40 }, colors: METAL, price: 80, group: 'retail', tags: ['hanging'] },
  { id: 'gondola-shelf', name: 'Gondola Shelving', category: 'Retail', kind: 'gondola', dimensions: { w: 120, d: 65, h: 165 }, colors: METAL, price: 260, group: 'retail', tags: ['aisle', 'shelf', 'grocery'] },
  { id: 'gondola-end', name: 'Gondola End Cap', category: 'Retail', kind: 'gondola', dimensions: { w: 90, d: 45, h: 150 }, colors: METAL, price: 180, group: 'retail', tags: ['endcap', 'shelf'] },
  { id: 'wall-shelving', name: 'Wall Shelving Unit', category: 'Retail', kind: 'shelfUnit', dimensions: { w: 100, d: 40, h: 200 }, colors: NEUTRAL, price: 220, group: 'retail', tags: ['shelf', 'display'] },
  { id: 'display-table', name: 'Display Table', category: 'Retail', kind: 'displayTable', dimensions: { w: 120, d: 80, h: 75 }, colors: WOOD, price: 190, group: 'retail', tags: ['nesting', 'feature'] },
  { id: 'display-cube', name: 'Display Cube', category: 'Retail', kind: 'displayTable', dimensions: { w: 45, d: 45, h: 45 }, colors: NEUTRAL, price: 70, group: 'retail', tags: ['riser', 'plinth'] },
  { id: 'glass-display', name: 'Glass Display Case', category: 'Retail', kind: 'displayCase', dimensions: { w: 120, d: 55, h: 95 }, colors: NEUTRAL, price: 420, group: 'retail', tags: ['jewelry', 'showcase', 'counter'] },
  { id: 'checkout-counter', name: 'Checkout Counter', category: 'Retail', kind: 'checkout', dimensions: { w: 150, d: 70, h: 95 }, colors: WOOD, price: 540, group: 'retail', tags: ['cashwrap', 'till', 'pos', 'register'] },
  { id: 'cash-wrap', name: 'Cash Wrap Desk', category: 'Retail', kind: 'counter', dimensions: { w: 120, d: 60, h: 95 }, colors: NEUTRAL, price: 360, group: 'retail', tags: ['counter', 'pos'] },
  { id: 'mannequin', name: 'Mannequin', category: 'Retail', kind: 'mannequin', dimensions: { w: 45, d: 45, h: 180 }, colors: NEUTRAL, price: 130, group: 'retail', tags: ['form', 'display', 'apparel'] },
  { id: 'bust-form', name: 'Bust Form', category: 'Retail', kind: 'mannequin', dimensions: { w: 40, d: 30, h: 90 }, colors: NEUTRAL, price: 60, group: 'retail', tags: ['torso'] },
  { id: 'fitting-room', name: 'Fitting Room', category: 'Retail', kind: 'fittingRoom', dimensions: { w: 120, d: 120, h: 210 }, colors: FABRIC, price: 620, group: 'retail', tags: ['changing', 'cubicle'] },
  { id: 'display-fridge', name: 'Display Fridge', category: 'Retail', kind: 'coolerUpright', dimensions: { w: 90, d: 75, h: 200 }, colors: APPLIANCE, price: 1200, group: 'retail', tags: ['cooler', 'drinks', 'grocery'] },
  { id: 'chest-freezer', name: 'Chest Freezer', category: 'Retail', kind: 'freezer', dimensions: { w: 150, d: 70, h: 85 }, colors: APPLIANCE, price: 980, group: 'retail', tags: ['frozen', 'grocery'] },
  { id: 'produce-bin', name: 'Produce Bin', category: 'Retail', kind: 'bin', dimensions: { w: 100, d: 70, h: 85 }, colors: WOOD, price: 210, group: 'retail', tags: ['fruit', 'veg', 'grocery'] },
  { id: 'basket-stack', name: 'Basket Stack', category: 'Retail', kind: 'basket', dimensions: { w: 40, d: 55, h: 70 }, colors: FABRIC, price: 45, group: 'retail', tags: ['shopping', 'baskets'] },
  { id: 'shopping-cart-bay', name: 'Cart Corral', category: 'Retail', kind: 'bin', dimensions: { w: 60, d: 120, h: 100 }, colors: METAL, price: 140, group: 'retail', tags: ['trolley', 'cart'] },
  { id: 'signage-stand', name: 'Signage Stand', category: 'Retail', kind: 'sign', dimensions: { w: 60, d: 45, h: 150 }, colors: ['#BC5B3A', '#1B1A17', '#D8D2C4'], price: 85, group: 'retail', tags: ['poster', 'a-frame', 'standee'] },
  { id: 'shelf-endcap-cafe', name: 'Barista Counter', category: 'Retail', kind: 'counter', dimensions: { w: 200, d: 70, h: 105 }, colors: WOOD, price: 720, group: 'retail', tags: ['cafe', 'coffee', 'bar'] },
  { id: 'salon-station', name: 'Salon Station', category: 'Retail', kind: 'displayCase', dimensions: { w: 90, d: 45, h: 130 }, colors: NEUTRAL, price: 380, group: 'retail', tags: ['mirror', 'barber', 'styling'] },

  // ---- Clinic / medical -------------------------------------------------
  { id: 'hospital-bed', name: 'Hospital Bed', category: 'Clinic', kind: 'bed', dimensions: { w: 100, d: 210, h: 90 }, colors: APPLIANCE, price: 1400, group: 'clinic', tags: ['patient', 'ward', 'medical'] },
  { id: 'exam-table', name: 'Exam Table', category: 'Clinic', kind: 'bench', dimensions: { w: 70, d: 190, h: 75 }, colors: NEUTRAL, price: 620, group: 'clinic', tags: ['examination', 'couch', 'medical'] },
  { id: 'reception-desk', name: 'Reception Desk', category: 'Clinic', kind: 'counter', dimensions: { w: 200, d: 70, h: 105 }, colors: WOOD, price: 720, group: 'clinic', tags: ['front', 'admin', 'welcome'] },
  { id: 'medicine-cabinet', name: 'Medicine Cabinet', category: 'Clinic', kind: 'cabinet', dimensions: { w: 90, d: 40, h: 190 }, colors: APPLIANCE, price: 340, group: 'clinic', tags: ['storage', 'supplies', 'medical'] },
  { id: 'waiting-chair', name: 'Waiting Chair', category: 'Clinic', kind: 'chair', dimensions: { w: 55, d: 58, h: 90 }, colors: FABRIC, price: 130, group: 'clinic', tags: ['seat', 'lobby'] },
  { id: 'dental-chair', name: 'Dental Chair', category: 'Clinic', kind: 'chair', dimensions: { w: 80, d: 150, h: 120 }, colors: APPLIANCE, price: 2200, group: 'clinic', tags: ['dentist', 'treatment'] },

  // ---- School / education ----------------------------------------------
  { id: 'classroom-desk', name: 'Classroom Desk', category: 'School', kind: 'desk', dimensions: { w: 120, d: 50, h: 75 }, colors: WOOD, price: 160, group: 'school', tags: ['student', 'table'] },
  { id: 'teacher-desk', name: 'Teacher Desk', category: 'School', kind: 'desk', dimensions: { w: 150, d: 70, h: 76 }, colors: WOOD, price: 320, group: 'school', tags: ['front', 'staff'] },
  { id: 'whiteboard', name: 'Whiteboard', category: 'School', kind: 'tv', dimensions: { w: 240, d: 8, h: 120 }, colors: NEUTRAL, price: 220, group: 'school', tags: ['board', 'wall'] },
  { id: 'lab-bench', name: 'Lab Bench', category: 'School', kind: 'counter', dimensions: { w: 200, d: 70, h: 90 }, colors: NEUTRAL, price: 540, group: 'school', tags: ['science', 'workbench'] },
  { id: 'school-locker', name: 'Lockers', category: 'School', kind: 'wardrobe', dimensions: { w: 120, d: 45, h: 180 }, colors: METAL, price: 480, group: 'school', tags: ['storage', 'corridor'] },
  { id: 'library-shelf', name: 'Library Shelf', category: 'School', kind: 'bookshelf', dimensions: { w: 120, d: 35, h: 210 }, colors: WOOD, price: 360, group: 'school', tags: ['books', 'stacks'] },

  // ---- Parking ----------------------------------------------------------
  { id: 'car', name: 'Car', category: 'Parking', kind: 'car', dimensions: { w: 190, d: 450, h: 150 }, colors: ['#3E4A5C', '#BC5B3A', '#D8D2C4', '#1B1A17'], price: 0, group: 'parking', tags: ['vehicle', 'bay', 'auto'] },
  { id: 'suv', name: 'SUV / Van', category: 'Parking', kind: 'car', dimensions: { w: 200, d: 500, h: 180 }, colors: ['#1B1A17', '#3E4A5C', '#B8BCC2'], price: 0, group: 'parking', tags: ['vehicle', 'large'] },
  { id: 'ev-charger', name: 'EV Charger', category: 'Parking', kind: 'sign', dimensions: { w: 40, d: 30, h: 150 }, colors: GREEN, price: 900, group: 'parking', tags: ['charge', 'electric'] },
  { id: 'parking-post', name: 'Bollard', category: 'Parking', kind: 'sign', dimensions: { w: 20, d: 20, h: 90 }, colors: ['#C79A45', '#1B1A17'], price: 40, group: 'parking', tags: ['post', 'barrier'] },
  { id: 'barrier-gate', name: 'Barrier Gate', category: 'Parking', kind: 'sign', dimensions: { w: 40, d: 300, h: 100 }, colors: METAL, price: 1800, group: 'parking', tags: ['boom', 'entry'] },

  // ---- Garden / landscape ----------------------------------------------
  { id: 'garden-tree', name: 'Tree', category: 'Garden', kind: 'tree', dimensions: { w: 200, d: 200, h: 400 }, colors: GREEN, price: 120, group: 'garden', tags: ['plant', 'shade'] },
  { id: 'hedge', name: 'Hedge Row', category: 'Garden', kind: 'planter', dimensions: { w: 200, d: 50, h: 100 }, colors: GREEN, price: 90, group: 'garden', tags: ['bush', 'border'] },
  { id: 'lawn-patch', name: 'Lawn', category: 'Garden', kind: 'lawn', dimensions: { w: 300, d: 300, h: 2 }, colors: GREEN, price: 60, group: 'garden', tags: ['grass', 'turf'] },
  { id: 'flower-bed', name: 'Flower Bed', category: 'Garden', kind: 'planter', dimensions: { w: 150, d: 60, h: 30 }, colors: ['#BC5B3A', '#4E7C59', '#C79A45'], price: 70, group: 'garden', tags: ['flowers', 'planting'] },
  { id: 'garden-path', name: 'Path', category: 'Garden', kind: 'rug', dimensions: { w: 100, d: 300, h: 2 }, colors: NEUTRAL, price: 50, group: 'garden', tags: ['walkway', 'paving'] },
  { id: 'fountain', name: 'Fountain', category: 'Garden', kind: 'roundTable', dimensions: { w: 160, d: 160, h: 90 }, colors: NEUTRAL, price: 640, group: 'garden', tags: ['water', 'feature', 'plaza'] },
  { id: 'pergola', name: 'Pergola', category: 'Garden', kind: 'bench', dimensions: { w: 300, d: 300, h: 240 }, colors: WOOD, price: 900, group: 'garden', tags: ['shade', 'patio'] },
];

export function catalogById(id) {
  return CATALOG.find((c) => c.id === id);
}

// Items that belong in the Shop/Retail library.
export function retailCatalog() {
  return CATALOG.filter((c) => c.group === 'retail');
}
