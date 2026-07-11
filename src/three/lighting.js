// Lighting presets for the 3D room view.
export const LIGHTING = {
  golden: {
    label: 'Golden Hour',
    dot: '#C79A45',
    background: '#EAE0D2',
    ambient: { color: '#FFE9CF', intensity: 0.7 },
    directional: { color: '#FFCE8A', intensity: 1.4, position: [4, 6, 2] },
    floor: '#E6D8C4',
  },
  night: {
    label: 'Night Mode',
    dot: '#7A8BB8',
    background: '#141310',
    ambient: { color: '#2E3550', intensity: 0.5 },
    directional: { color: '#8FA3D8', intensity: 0.7, position: [-3, 5, 3] },
    floor: '#20211F',
  },
};

export const LIGHTING_ORDER = ['golden', 'night'];
