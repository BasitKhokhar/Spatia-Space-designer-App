// Starter templates for the "Use a Template" path. Each carries a `roomType`
// so the editor seeds the matching starter layout, and a `category` so the
// create flow can split Home vs Shop.
export const TEMPLATES = [
  // ---- Home ----
  { id: 't_flat', name: '1-Bed Flat', rooms: 3, variant: 0, category: 'home', roomType: 'living', dimensions: { width: 5.0, length: 4.0 } },
  { id: 't_studio', name: 'Studio', rooms: 1, variant: 1, category: 'home', roomType: 'living', dimensions: { width: 4.2, length: 3.6 } },
  { id: 't_loft', name: 'Loft', rooms: 2, variant: 2, category: 'home', roomType: 'living', dimensions: { width: 6.0, length: 4.2 } },
  { id: 't_bedroom', name: 'Bedroom', rooms: 1, variant: 3, category: 'home', roomType: 'bedroom', dimensions: { width: 4.0, length: 3.4 } },

  // ---- Shop / Retail ----
  { id: 't_retail', name: 'Retail Store', rooms: 1, variant: 2, category: 'shop', roomType: 'retail', dimensions: { width: 9.0, length: 12.0 } },
  { id: 't_boutique', name: 'Boutique', rooms: 1, variant: 1, category: 'shop', roomType: 'boutique', dimensions: { width: 6.0, length: 8.0 } },
  { id: 't_grocery', name: 'Grocery', rooms: 1, variant: 0, category: 'shop', roomType: 'grocery', dimensions: { width: 10.0, length: 14.0 } },
  { id: 't_cafe', name: 'Café', rooms: 1, variant: 3, category: 'shop', roomType: 'cafe', dimensions: { width: 7.0, length: 9.0 } },
];

export function templatesByCategory(category = 'home') {
  return TEMPLATES.filter((t) => t.category === category);
}
