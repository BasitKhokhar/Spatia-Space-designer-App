// Room types offered in the create flow. `icon` is a key in the Icon set.
// `category` splits Home vs Shop so the create flow can offer two modes.
export const ROOM_TYPES = [
  // ---- Home ----
  { id: 'living', label: 'Living Room', category: 'home', icon: 'home', defaults: { width: 5.4, length: 3.6 } },
  { id: 'bedroom', label: 'Bedroom', category: 'home', icon: 'square', defaults: { width: 4.0, length: 3.4 } },
  { id: 'kitchen', label: 'Kitchen', category: 'home', icon: 'grid', defaults: { width: 3.6, length: 3.0 } },
  { id: 'bathroom', label: 'Bathroom', category: 'home', icon: 'ruler', defaults: { width: 2.4, length: 2.0 } },
  { id: 'office', label: 'Office', category: 'home', icon: 'file', defaults: { width: 3.2, length: 3.0 } },
  { id: 'dining', label: 'Dining', category: 'home', icon: 'window', defaults: { width: 4.0, length: 3.2 } },

  // ---- Shop / Retail ----
  { id: 'retail', label: 'Retail Store', category: 'shop', icon: 'store', defaults: { width: 9.0, length: 12.0 } },
  { id: 'boutique', label: 'Boutique', category: 'shop', icon: 'hanger', defaults: { width: 6.0, length: 8.0 } },
  { id: 'grocery', label: 'Grocery', category: 'shop', icon: 'cart', defaults: { width: 10.0, length: 14.0 } },
  { id: 'cafe', label: 'Café', category: 'shop', icon: 'coffee', defaults: { width: 7.0, length: 9.0 } },
  { id: 'salon', label: 'Salon', category: 'shop', icon: 'scissors', defaults: { width: 6.0, length: 8.0 } },
  { id: 'warehouse', label: 'Warehouse', category: 'shop', icon: 'cube', defaults: { width: 14.0, length: 20.0 } },
];

export function roomTypeById(id) {
  return ROOM_TYPES.find((r) => r.id === id) || ROOM_TYPES[0];
}

export function roomTypesByCategory(category = 'home') {
  return ROOM_TYPES.filter((r) => r.category === category);
}

export function isShopRoom(id) {
  return roomTypeById(id).category === 'shop';
}
