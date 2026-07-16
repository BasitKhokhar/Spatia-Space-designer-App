// Floor & wall finishes. `c2d` tints the 2D plan floor; `c3d` colors the 3D
// floor mesh. `rough` feeds the 3D material roughness for a hint of realism.
export const FLOOR_MATERIALS = [
  { id: 'oak', label: 'Oak', c2d: '#EADFC9', c3d: '#D8B98C', rough: 0.8 },
  { id: 'walnut', label: 'Walnut', c2d: '#C7AC90', c3d: '#7C5A3C', rough: 0.7 },
  { id: 'ash', label: 'Ash Grey', c2d: '#DAD6CE', c3d: '#BBB4A8', rough: 0.85 },
  { id: 'tile', label: 'Tile', c2d: '#E4E7E9', c3d: '#D3D8DB', rough: 0.4 },
  { id: 'marble', label: 'Marble', c2d: '#EFECE7', c3d: '#E6E2DB', rough: 0.2 },
  { id: 'concrete', label: 'Concrete', c2d: '#D3D2CE', c3d: '#A9A8A4', rough: 0.9 },
  { id: 'carpet', label: 'Carpet', c2d: '#D8CBC2', c3d: '#B49C90', rough: 1.0 },
  { id: 'terracotta', label: 'Terracotta', c2d: '#E7C3AC', c3d: '#C07A54', rough: 0.85 },
];

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
