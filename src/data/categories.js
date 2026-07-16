// Top-level construction categories shown on the "Start Blank" browse flow.
// The user picks a category, then sees the furnished starter ideas authored for
// it in `starterIdeas.js` (matched by `categoryId`). `icon` is a key in the
// Icon set; `blurb` is the one-line description on the category card.
export const CATEGORIES = [
  { id: 'house', name: 'House', icon: 'home', blurb: 'Homes, flats & rooms' },
  { id: 'apartment', name: 'Apartment', icon: 'building', blurb: 'Units & residential blocks' },
  { id: 'office', name: 'Office', icon: 'briefcase', blurb: 'Workspaces & meeting rooms' },
  { id: 'retail', name: 'Retail Shop', icon: 'store', blurb: 'Stores, groceries & showrooms' },
  { id: 'cafe', name: 'Café & Dining', icon: 'coffee', blurb: 'Cafés, bars & restaurants' },
  { id: 'salon', name: 'Salon & Spa', icon: 'scissors', blurb: 'Salons, barbers & beauty' },
  { id: 'warehouse', name: 'Warehouse', icon: 'cube', blurb: 'Storage, racking & logistics' },
  { id: 'clinic', name: 'Clinic', icon: 'health', blurb: 'Medical, dental & wards' },
  { id: 'school', name: 'School', icon: 'school', blurb: 'Classrooms, labs & libraries' },
  { id: 'parking', name: 'Parking', icon: 'parking', blurb: 'Lots, garages & bays' },
  { id: 'garden', name: 'Garden', icon: 'tree', blurb: 'Yards, patios & landscapes' },
  { id: 'plaza', name: 'Plaza & Mall', icon: 'plaza', blurb: 'Malls, courts & atriums' },
];

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
}
