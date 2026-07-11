// Room types offered in the create flow. `icon` is a key in the Icon set.
export const ROOM_TYPES = [
  { id: 'living', label: 'Living Room', icon: 'home', defaults: { width: 5.4, length: 3.6 } },
  { id: 'bedroom', label: 'Bedroom', icon: 'square', defaults: { width: 4.0, length: 3.4 } },
  { id: 'kitchen', label: 'Kitchen', icon: 'grid', defaults: { width: 3.6, length: 3.0 } },
  { id: 'bathroom', label: 'Bathroom', icon: 'ruler', defaults: { width: 2.4, length: 2.0 } },
  { id: 'office', label: 'Office', icon: 'file', defaults: { width: 3.2, length: 3.0 } },
  { id: 'dining', label: 'Dining', icon: 'window', defaults: { width: 4.0, length: 3.2 } },
];

export function roomTypeById(id) {
  return ROOM_TYPES.find((r) => r.id === id) || ROOM_TYPES[0];
}
