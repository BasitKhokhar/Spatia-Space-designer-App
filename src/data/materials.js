// Floor & wall finishes. `c2d` tints the 2D plan floor; `c3d` colors the 3D
// floor mesh. `rough` feeds the 3D material roughness for a hint of realism.
export const FLOOR_MATERIALS = [
  { id: 'oak', label: 'Oak', c2d: '#EADFC9', c3d: '#D8B98C', rough: 0.8 },
  { id: 'walnut', label: 'Walnut', c2d: '#C7AC90', c3d: '#7C5A3C', rough: 0.7 },
  { id: 'ash', label: 'Ash Grey', c2d: '#DAD6CE', c3d: '#BBB4A8', rough: 0.85 },
  // Distinct board layouts rather than tints of the same texture — these have
  // their own ambientCG sources (WoodFloor008 / WoodFloor051).
  { id: 'plank', label: 'Wide Plank', c2d: '#E3CDAC', c3d: '#CDAA80', rough: 0.7 },
  { id: 'herringbone', label: 'Herringbone', c2d: '#E0C8A6', c3d: '#C9A276', rough: 0.68 },
  { id: 'tile', label: 'Tile', c2d: '#E4E7E9', c3d: '#D3D8DB', rough: 0.4 },
  { id: 'marble', label: 'Marble', c2d: '#EFECE7', c3d: '#E6E2DB', rough: 0.2 },
  { id: 'concrete', label: 'Concrete', c2d: '#D3D2CE', c3d: '#A9A8A4', rough: 0.9 },
  { id: 'carpet', label: 'Carpet', c2d: '#D8CBC2', c3d: '#B49C90', rough: 1.0 },
  { id: 'terracotta', label: 'Terracotta', c2d: '#E7C3AC', c3d: '#C07A54', rough: 0.85 },
];

// Wall finishes. `id` is a key into three/materials/manifest.js MATERIAL_DEFS,
// so picking one swaps the 3D wall's texture, normal map and roughness — not
// just its tint. `c2d` is the swatch shown in the picker.
//
// The plan field (`materials.wallMaterial`) and the 3D path have existed since
// the materials work landed; only this list and the picker were missing, which
// is why brick walls were unreachable from the UI.
export const WALL_MATERIALS = [
  { id: 'plaster', label: 'Plaster', c2d: '#F1ECE3' },
  { id: 'paint', label: 'Flat Paint', c2d: '#FBF6F1' },
  { id: 'brick', label: 'Brick', c2d: '#B4705A' },
  { id: 'concrete', label: 'Concrete', c2d: '#BDBCB8' },
  { id: 'wood', label: 'Panelling', c2d: '#A88A70' },
  { id: 'stone', label: 'Stone', c2d: '#C6C1B7' },
];

export function wallMaterialById(id) {
  return WALL_MATERIALS.find((m) => m.id === id) || WALL_MATERIALS[0];
}

export const WALL_COLORS = [
  '#EBE4D8',
  '#FBF6F1',
  '#E7DDCB',
  '#D8D2C4',
  '#CBB7A3',
  '#B7C4B4',
  '#AEB9C6',
  '#C9B0A6',
  '#8A8378',
  '#3E4A5C',
];

export function floorMaterialById(id) {
  return FLOOR_MATERIALS.find((m) => m.id === id) || FLOOR_MATERIALS[0];
}
